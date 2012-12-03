node-MessageBus
================

A client for the MessageBus RESTful API, Version 4

Get started:

```
npm install node-MessageBus
```

Send email:

```
// send a single email
var MsgBusClient = require("MessageBus").MsgBusClient;
var client = new MsgBusClient(apiKey);
client.sendEmailMessage("test@example.com", "Customer Service <cs@example.com>", "Hello subjective world");
```

Send bulk email, 20 messages at a time:

```
var sender = new BatchSender(client);
messages.forEach(function(msg) {
	// once 20 messages are pushed, sender automatically sends
	sender.push(msg.toEmail, "Customer Service <cs@example.com>", "Hello subjective world", function(err, result) {
		// called each time a message is sent
		if (err) {
			console.error(err);
		} else {
			console.info("message sent:", result);
		}
	});
});

// don't forget to call flush at the end
sender.flush();
```

## Complete and tested:

 * Sending Email
  * /v4/message/email/send
 * Email Metrics
  * /v4/stats/email
 * Bounces
  * /v4/bounces
  * /v4/bounces/channel/%CHANNEL_KEY%
 * Complaint Processing
  * /v4/complaints
 * Unsubscribe Requests
  * /v4/unsubs
  * /v4/unsubs/channel/%CHANNEL_KEY%
 * Separating Mail Streams (Channels)
  * /v4/channels
  * /v4/channel/%CHANNEL_KEY%/config

## TODO:

 * FIX (test skipped, timing out): /v4/stats/email/channel/%CHANNEL_KEY%
 * FIX (test skipped, timing out): /v4/complaints/channel/%CHANNEL_KEY%
 * FIX (test skipped, timing out): /v4/channel/%CHANNEL_KEY%/sessions

 * implement: /v4/stats/email/channel/%CHANNEL_KEY%/session/%SESSION_KEY%
 * implement: POST /v4/channel/%CHANNEL_KEY%/sessions
 * implement: /v4/channel/%CHANNEL_KEY%/session/%SESSION_KEY%/rename
