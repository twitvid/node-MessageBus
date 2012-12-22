Hello <em>{{name}}</em>
You have just won <strong>${{value}}</strong>!
{{#in_ca}}
<h1 id="blink" style="color:red;">Well, ${{taxed_value}}, after taxes.</h1>
<script>
var blink = document.getElementById('blink');
var isOn = true;
setTimeout(function() {
	if (isOn) {
		blink.style.visibility = "hidden";
		isOn = false;
	} else {
		blink.style.visibility = visible;
		isOn = true;
	}
}, 1000);
</script>
{{/in_ca}}