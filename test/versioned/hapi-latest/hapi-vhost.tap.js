'use strict'

// hapi 10.x and higher works on Node 4 and higher
var semver = require('semver')
if (semver.satisfies(process.versions.node, '<4.0')) return

var path    = require('path')
  , test    = require('tap').test
  , request = require('request')
  , helper  = require(path.join(__dirname, '..', '..', 'lib', 'agent_helper.js'))



test("Hapi vhost support", function (t) {
  t.plan(1)

  t.test("should not explode when using vhosts", function (t) {
    var agent  = helper.instrumentMockedAgent({ send_request_uri_attribute: true })
      , hapi   = require('hapi')
      , server = new hapi.Server()

    server.connection({
      port: 8089
    })


    // disabled by default
    agent.config.capture_params = true

    agent.on('transactionFinished', function (transaction) {
      t.ok(transaction.trace, 'transaction has a trace.')
      if (transaction.trace.parameters.httpResponseMessage) {
        t.deepEqual(transaction.trace.parameters, {
          "request.headers.accept" : "application/json",
          "request.headers.host" : "localhost:8089",
          "request.method" : "GET",
          "response.status" : 200,
          "httpResponseCode": "200",
          "httpResponseMessage": "OK",
          "id" : "1337",
          "name" : "hapi",
          "request_uri" : "/test/1337/2"
        }, 'parameters should have name and id')
      } else {
        t.deepEqual(transaction.trace.parameters, {
          "request.headers.accept" : "application/json",
          "request.headers.host" : "localhost:8089",
          "request.method" : "GET",
          "response.status" : 200,
          "httpResponseCode": "200",
          "id" : "1337",
          "name" : "hapi",
          "request_uri" : "/test/1337/2"
        }, 'parameters should have name and id')
      }

      helper.unloadAgent(agent)
      server.stop(function () {
        t.end()
      })
    })

    server.route({
      method: 'GET',
      path: '/test/{id}/',
      vhost: 'localhost',
      handler: function (request, reply) {
        t.ok(agent.getTransaction(), "transaction is available")

        reply({status : 'ok'})
      }
    })

    server.route({
      method: 'GET',
      path: '/test/{id}/2',
      vhost: 'localhost',
      handler: function (request, reply) {
        t.ok(agent.getTransaction(), "transaction is available")

        reply({status : 'ok'})
      }
    })

    server.start(function () {
      request.get('http://localhost:8089/test/1337/2?name=hapi',
                  {json : true},
                  function (error, res, body) {

        t.equal(res.statusCode, 200, "nothing exploded")
        t.deepEqual(body, {status : 'ok'}, "got expected response")
      })
    })
  })
})
