node-MessageBus
================

A client for the MessageBus RESTful API, Version 4

Get started:

```
npm install node-MessageBus
```

Send emails:

```
// send a single email
var MsgBusClient = require("MessageBus").MsgBusClient;
var client = new MsgBusClient(apiKey);
client.sendEmailMessage("test@example.com", "Customer Service <cs@example.com>", "Hello subjective world");

// send multiple emails
var sender = new BatchSender(client);
sender.push(messages);
```

## Complete and tested:

 * /v4/message/email/send
 * /v4/stats/email
 * /v4/channels,
 * /v4/bounces

## TODO:

 * fix (currently timing out): /v4/stats/email/channel/%CHANNEL_KEY%
 * implement: /v4/stats/email/channel/%CHANNEL_KEY%/session/%SESSION_KEY%
 * implement: /v4/unsubs
 * implement: /v4/unsubs/channel/%CHANNEL_KEY%
 * implement: /v4/complaints
 * implement: /v4/complaints/channel/%CHANNEL_KEY%
 * implement: /v4/bounces/channel/%CHANNEL_KEY%
 * implement: /v4/channel/%CHANNEL_KEY%/config
 * implement: /v4/channel/%CHANNEL_KEY%/sessions
 * implement: /v4/channel/%CHANNEL_KEY%/session/%SESSION_KEY%/rename
