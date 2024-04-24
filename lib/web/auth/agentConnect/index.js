'use strict'

const passport = require('passport')
const Router = require('express').Router
const passportStrategy = require('@passport-next/passport-strategy')
const util = require('util')
const openIdClient = require('openid-client')

const { urlencodedParser } = require('../../utils')
const config = require('../../../config')

const REDIRECT_URI = `${config.serverURL}/auth/agent-connect/callback`

let _client

// TODO: refactor as a class method
const getClient = async () => {
  if (_client) {
    return _client
  } else {
    const { agentConnect } = config
    const agentConnectIssuer = await openIdClient.Issuer.discover(
      `${agentConnect.baseUrl}/.well-known/openid-configuration`
    )
    _client = new agentConnectIssuer.Client({
      client_id: agentConnect.clientID,
      client_secret: agentConnect.clientSecret,
      redirect_uris: [REDIRECT_URI],
      userinfo_signed_response_alg: agentConnect.userinfoSignedResponseAlg
    })
    return _client
  }
}

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

agentConnectAuth.get('/auth/agent-connect', urlencodedParser, function (req, res, next) {
  passport.authenticate('agentConnect')(req, res, next)
})

agentConnectAuth.get('/auth/agent-connect/callback',
  passport.authenticate('agentConnect', {
    successReturnToOrRedirect: config.serverURL + '/',
    failureRedirect: config.serverURL + '/'
  })
)
