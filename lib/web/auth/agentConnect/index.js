'use strict'

const passport = require('passport')
const Router = require('express').Router
const passportStrategy = require('@passport-next/passport-strategy')
const util = require('util')
const openIdClient = require('openid-client')

const { urlencodedParser } = require('../../utils')
const config = require('../../../config')
const models = require('../../../models')
const logger = require('../../../logger')

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

AgentConnectStrategy.prototype.authenticate = async function (req) {
  const client = await getClient()

  // If a code is present in the query parameters, the authentication process is triggered for the callback
  if (req.query && req.query.code) {
    const params = client.callbackParams(req)

    // Verify the state parameter for CSRF protection
    if (req.session.state !== params.state) {
      // TODO - handle failure
      console.log('callback failure')
    }

    // Exchange the authorization code for an access token
    const tokenSet = await client.grant({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: REDIRECT_URI,
      scope: config.agentConnect.scopes
    })

    const accessToken = tokenSet.access_token

    if (!accessToken) {
      // TODO - handle failure
      console.log('callback failure')
    }

    // Retrieve user information from the UserInfo endpoint
    const userInfo = await client.userinfo(tokenSet)
    const self = this

    // Verify user information and call passport callback functions
    function verified (err, user, info) {
      if (err) { return this.error(err) }
      if (!user) { return this.fail(info) }
      self.success(user, info)
    }
    self._verify(userInfo.email, userInfo, verified)
  } else {
    // Generate nonce and state parameters for OIDC Authorization Request
    const nonce = openIdClient.generators.nonce()
    const state = openIdClient.generators.state()

    // Persist state and nonce to session cache to handle Authorization callback
    req.session.state = state
    req.session.nonce = nonce
    await req.session.save()

    // Redirect the user to the authorization URL
    const authorizationUrl = client.authorizationUrl({
      scope: config.agentConnect.scopes,
      acr_values: config.agentConnect.acrValues,
      response_type: 'code',
      nonce,
      state
    })
    this.redirect(authorizationUrl)
  }
}

// FIXME: Consider handling the case when migrating from AC to MCP.
passport.use(new AgentConnectStrategy({}, function (profileId, profile, done) {
  const stringifiedProfile = JSON.stringify(profile)
  models.User.findOrCreate({
    where: {
      profileid: profileId
    },
    defaults: {
      profile: stringifiedProfile
    }
  }).spread(function (user, created) {
    if (user) {
      let needSave = false
      if (user.profile !== stringifiedProfile) {
        user.profile = stringifiedProfile
        needSave = true
      }
      if (needSave) {
        user.save().then(function () {
          logger.debug(`user login: ${user.id}`)
          return done(null, user)
        })
      } else {
        logger.debug(`user login: ${user.id}`)
        return done(null, user)
      }
    }
  }).catch(function (err) {
    logger.error('auth callback failed: ' + err)
    return done(err, null)
  })
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
