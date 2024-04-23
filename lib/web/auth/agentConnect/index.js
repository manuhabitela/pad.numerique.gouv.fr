'use strict'

const passport = require('passport')
const Router = require('express').Router
const passportStrategy = require('@passport-next/passport-strategy')
const util = require('util')

const agentConnectAuth = module.exports = Router()

function AgentConnectStrategy (options, verify) {
  passport.Strategy.call(this)
  this.name = 'agentConnect'
  this._verify = verify
}

util.inherits(AgentConnectStrategy, passportStrategy.Strategy)

AgentConnectStrategy.prototype.authenticate = async function(req) {
  // TODO: implement authenticate method
  console.log('authenticate')
}

passport.use(new AgentConnectStrategy({}, function (profileId, profile, done) {
  // TODO: implement authentication callback
  console.log('authentication successful')
}))
