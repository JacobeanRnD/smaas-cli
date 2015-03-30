'use strict';
// jshint node: true
/* global describe, beforeEach, afterEach, it, expect */

var nixt = require('nixt'),
  fs = require('fs'),
  util = require('./util')();

describe('SCXML-CLI', function () {
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
      expect(fs.readFileSync(util.tempPath + '/helloworld.scxml', 'utf-8')).toBe(req.body);

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
    util.passToTestRunner = function (req, res) {
      expect(req.path).toBe(util.baseApi + 'helloearth.scxml');
      expect(req.method).toBe('PUT');
      expect(req.headers['content-type']).toBe('application/xml');
      expect(fs.readFileSync(util.tempPath + '/helloworld.scxml', 'utf-8')).toBe(req.body);

      res.sendStatus(201);
    };

    util.createHelloWorld(function () {
      //Save created file
      nixt()
        .run(util.client + 'save ' + util.tempPath + '/helloworld.scxml -n helloearth')
        .expect(util.checkStderr)
        .end(done);
    });
  });

  it('should save helloworld.scxml and handler.json', function (done) {
    util.passToTestRunner = function (req, res) {
      req.body = JSON.parse(req.body);
      req.body.handlers = JSON.parse(req.body.handlers);

      expect(req.path).toBe(util.baseApi + 'helloworld.scxml');
      expect(req.method).toBe('PUT');
      expect(req.headers['content-type']).toBe('application/json');
      expect(fs.readFileSync(util.tempPath + '/helloworld.scxml', 'utf-8')).toBe(req.body.scxml);
      expect(req.body.handlers.testhandler).toBe('testhandlerbody');

      res.sendStatus(201);
    };

    util.createHelloWorld(function () {
      var handler = { testhandler: 'testhandlerbody' };
      var result = fs.writeFileSync(util.tempPath + '/helloworld.json', JSON.stringify(handler), 'utf-8');

      expect(handler.length).toBe(result);

      //Save created file
      nixt()
        .run(util.client + 'save ' + util.tempPath + '/helloworld.scxml -h ' + util.tempPath + '/helloworld.json')
        .expect(util.checkStderr)
        .end(done);
    });
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

  // TODO: Write tests for --watch option, nixt can't run unending commands

  it('should get the list of statecharts', function (done) {
    var statecharts = ['helloworld.scxml', 'chartone.scxml', 'charttwo.scxml'];
    util.passToTestRunner = function (req, res) {
      expect(req.path).toBe(util.baseApi + '_all_statechart_definitions');
      expect(req.method).toBe('GET');

      res.send(statecharts);
    };

    nixt({ colors: false, newlines: false })
      .run(util.client + 'ls')
      .expect(util.checkStderr)
      .stdout('Statechart list:' + JSON.stringify(statecharts))
      .end(done);
  });

  it('should get the list of instances for helloworld.scxml', function (done) {
    var instances = ['helloworld.scxml/7b5dba0b-3b58-4ffb-ab2f-a5cb6b1bdd58', 'helloworld.scxml/95c43c84-7bd6-4784-8852-1806eaa5972c'];
    util.passToTestRunner = function (req, res) {
      expect(req.path).toBe(util.baseApi + 'helloworld.scxml/_all_instances');
      expect(req.method).toBe('GET');

      res.send(instances);
    };

    nixt({ colors: false, newlines: false })
      .run(util.client + 'ls helloworld.scxml')
      .expect(util.checkStderr)
      .stdout('Instance list:' + JSON.stringify(instances))
      .end(done);
  });
});