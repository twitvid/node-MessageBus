var TemplateStream = require('../index.js').TemplateStream;
var assert = require('assert');

describe('TemplateStream', function() {
	it('data', function(done) {
		var ts = new TemplateStream({
			name: "Default Name",
			value: "10",
			in_ca: true
		}).compileFiles({
			html: __dirname + '/templates/html.ms',
			plain: __dirname + '/templates/plain.ms'
		});

		ts.on('data', function(data) {
			assert.ok(data.html);
			assert.ok(data.plain);
			assert.ok(data.templateData);
		});

		ts.on('close', function() {
			done();
		});

		ts.write({
			name: "Linus",
			value: "10",
			in_ca: true,
			taxed_value: "2"
		});

		ts.write({
			name: "Smart",
			value: "20",
			in_ca: true,
			taxed_value: "4"
		});

		ts.write({
			name: "Scott",
			value: "25",
			in_ca: false,
			taxed_value: "5"
		});

		ts.end();
	});
});
