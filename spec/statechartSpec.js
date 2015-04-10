'use strict';
// jshint node: true
/* global describe, beforeEach, afterEach, it, expect */

var nixt = require('nixt'),
  spawn = require('child_process').spawn,
  util = require('./util')();

describe('SCXML-CLI - statecharts', function () {
  beforeEach(function(done) {
    util.beforeEach(done);
  });

  afterEach(function (done) {
    util.afterEach(done);
  });

  it('should create helloworld file locally', function (done) {
    util.createHelloWorld(done);
  });

  it('should save helloworld.scxml', function (done) {
    util.passToTestRunner = function (req, res) {
      // Intercepted API call should be: PUT /api/v1/helloworld.scxml with application/xml
      expect(req.path).toBe(util.baseApi + 'helloworld.scxml');
      expect(req.method).toBe('PUT');
      expect(req.headers['content-type']).toBe('application/xml');
      expect(util.read(util.tempPath + '/helloworld.scxml')).toBe(req.body);

      res.sendStatus(201);
    };

    util.createHelloWorld(function () {
      //Save created file
      nixt()
        .run(util.client + 'save ' + util.tempPath + '/helloworld.scxml')
        .expect(util.checkStderr)
        .end(done);
    });
  });

  it('should save helloworld.scxml as helloearth.scxml', function (done) {
    var name = 'helloearth';
    util.passToTestRunner = function (req, res) {
      expect(req.path).toBe(util.baseApi + name + '.scxml');
      expect(req.method).toBe('PUT');
      expect(req.headers['content-type']).toBe('application/xml');
      expect(util.read(util.tempPath + '/helloworld.scxml')).toBe(req.body);

      res.sendStatus(201);
    };

    util.createHelloWorld(function () {
      //Save created file
      nixt()
        .run(util.client + 'save ' + util.tempPath + '/helloworld.scxml -n ' + name)
        .expect(util.checkStderr)
        .end(done);
    });
  });

  it('should save helloworld.scxml and handler.json', function (done) {
    var handler = { testhandler: 'testhandlerbody' };

    util.passToTestRunner = function (req, res) {
      req.body = JSON.parse(req.body);
      req.body.handlers = JSON.parse(req.body.handlers);

      expect(req.path).toBe(util.baseApi + 'helloworld.scxml');
      expect(req.method).toBe('PUT');
      expect(req.headers['content-type']).toBe('application/json');
      expect(util.read(util.tempPath + '/helloworld.scxml')).toBe(req.body.scxml);
      expect(req.body.handlers).toEqual(handler);

      res.sendStatus(201);
    };

    util.createHelloWorld(function () {
      var result = util.write(util.tempPath + '/helloworld.json', JSON.stringify(handler));

      expect(handler.length).toBe(result);

      //Save created file
      nixt()
        .run(util.client + 'save ' + util.tempPath + '/helloworld.scxml -h ' + util.tempPath + '/helloworld.json')
        .expect(util.checkStderr)
        .end(done);
    });
  });

  it('should save helloworld.scxml -w, save on every change', function (done) {
    var stdout = '', stderr = '';

    util.passToTestRunner = function (req, res) {
      expect(req.path).toBe(util.baseApi + 'helloworld.scxml');
      expect(req.method).toBe('PUT');
      expect(req.headers['content-type']).toBe('application/xml');
      expect(util.read(util.tempPath + '/helloworld.scxml')).toBe(req.body);

      if(req.body === 'testdone') {
        expect(stdout.length).toBeGreaterThan(0);
        expect(stderr.length).toBe(0);
        done();
      }

      res.sendStatus(201);
    };

    util.createHelloWorld(function () { 
      var subscribed = spawn('node', [util.mainProgram, '-H', util.host, 'save', util.tempPath + '/helloworld.scxml', '-w']);

      subscribed.stdout.on('data', function (data) { stdout += data; });
      subscribed.stderr.on('data', function (data) { stderr += data; });
    });

    setTimeout(function () {
      util.write(util.tempPath + '/helloworld.scxml', 'testdone');
    }, 1000);
  });

  it('should fail to save missing file', function (done) {
     util.createHelloWorld(function () {
      nixt()
        .run(util.client + 'save ' + util.tempPath + '/helloworld.scxml -h missing.json')
        .expect(function (result) {
          expect(result.stderr.length).toBeGreaterThan(0);
        })
        .end(done);
    });
  });

  it('should fail to save missing handler file', function (done) {
    nixt()
      .run(util.client + 'save missing.scxml')
      .expect(function (result) {
        expect(result.stderr.length).toBeGreaterThan(0);
      })
      .end(done);
  });

  it('should fail to save empty path', function (done) {
    nixt()
      .run(util.client + 'save')
      .expect(function (result) {
        expect(result.stderr.length).toBeGreaterThan(0);
      })
      .end(done);
  });

  it('should get the contents of a statechart', function (done) {
    util.passToTestRunner = function (req, res) {
      expect(req.path).toBe(util.baseApi + 'helloworld.scxml');
      expect(req.method).toBe('GET');

      res.send(util.read(util.tempPath + '/helloworld.scxml'));
    };

    util.createHelloWorld(function () {
      nixt({ colors: false })
        .run(util.client + 'save ' + util.tempPath + '/helloworld.scxml')
        .expect(util.checkStderr)
        .run(util.client + 'cat helloworld.scxml')
        .expect(util.checkStderr)
        .stdout('Statechart details:\n' + util.read(util.tempPath + '/helloworld.scxml'))
        .end(done);
    });
  });

  // TODO: Write tests for --watch option, nixt can't run unending commands

  it('should get the list of statecharts', function (done) {
    var statecharts = ['helloworld.scxml', 'chartone.scxml', 'charttwo.scxml'];
    util.passToTestRunner = function (req, res) {
      expect(req.path).toBe(util.baseApi + '_all_statechart_definitions');
      expect(req.method).toBe('GET');

      res.send({ data: { charts: statecharts }});
    };

    nixt({ colors: false, newlines: false })
      .run(util.client + 'ls')
      .expect(util.checkStderr)
      .stdout('Statechart list:' + statecharts.join(''))
      .end(done);
  });

  it('should remove a statechart', function (done) {
    util.passToTestRunner = function (req, res) {
      expect(req.path).toBe(util.baseApi + 'helloworld.scxml');
      expect(req.method).toBe('DELETE');

      res.sendStatus(200);
    };

    nixt()
      .run(util.client + 'rm helloworld.scxml')
      .expect(util.checkStderr)
      .end(done);
  });
});