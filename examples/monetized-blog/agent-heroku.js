var Agent = require('../..').Agent;

var agent = new Agent('heroku', true);
agent.ensurePeer('reader', parseInt(process.env.PORT));