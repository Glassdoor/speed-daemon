var	speedDaemonConfig =
		{

		};

var speedDaemon = (function() {

	var		fs = require('fs');
	var		page = require('webpage').create();
	var		t;
	var		args = phantom.args;
	var		address = args[0] || encodeURI(address)+'.txt';
	var		output = args[2] || encodeURI(address)+'.jpg';
	var		requests = {};
	var		responses = {};
	var		pageInfo =	{
							url:		address,
							assets:		[]
						};

	if (args.length === 0) {
		usage();
		phantom.exit();
	}

	if (args.length > 1) {
		phantom.exit();
	}

	page.onResourceRequested = function (r) {
		//console.log('Request ' + JSON.stringify(r, undefined, 4));
		if(r)requests[r.id]=r;
	};

	page.onResourceReceived = function (r) {
		//console.log('Receive ' + JSON.stringify(r, undefined, 4));
		//phantom.exit();
		if(r && !(r.id in responses)){
			responses[r.id]=r;
			//console.log('/* '+r.stage+' */');
		} else {
			//r.bodySize=responses[r.id].bodySize;
			for(var i in responses[r.id]){
				if(responses[r.id].hasOwnProperty(i) && !(i in r)){
					r[i]=responses[r.id][i];
				}
			}
			r.received=responses[r.id].time;
			pageInfo.assets.push({
				request:requests[r.id],
				response:r
			});
		}
		//var start=Date.parse(requests[r.id].time),end=Date.parse(r.time)
		//console.log((end-start)+'ms',r.status, r.url.substring(0,50));
	};

	t = Date.now();
	address = args[0];
	page.open(address, function (status) {
		pageInfo.requestTime=t;
		pageInfo.responseTime=Date.now();
		if (status !== 'success') {
			console.log('/* FAIL to load the address */');
		} else {
			t = Date.now() - t;

			page.evaluateAsync(function() {
				console.log("last chance");
				window.onload = function(){
										console.log(Date.now())};
									});

			printToFile(JSON.stringify(pageInfo, undefined, 4));

			//page.render(output);
			/*for(var r in requests){
			 var start=Date.parse(requests[r].time),end=Date.parse(responses[r].time)
			 console.log((end-start)+'ms',responses[r].status, r.substring(0,50));
			 }*/
		}
		phantom.exit();
	});

	function printToFile(data) {
		var f, g,html, myfile, fileid, myjson, jspath,
			keys = [], values = [], extension = 'html';

		if (!args[1]) {
			fileid = args[0].replace('http://','').replace('https://','').replace(/\//g,'');
			fileid = fileid.split('?')[0];
		}
		else{
			fileid = args[1];
		}

		myfile = 'speedreports/' + fileid + '.' + extension;
		myjson = fileid;



		if (fs.exists(myfile)) {
			fs.remove(myfile);
		}

		/*
		 * write the headers and first line
		 */
		try {
			f = fs.open(myfile, "w");
			g = fs.open('speedreports/' + myjson  + '.js', "w");
			g.writeLine('var reportdata = ' + data + ';');
			g.close();

			if(!fs.exists('speedreport.html')){
				html = fs.read('loadreport/speedreport.html');
			}
			else{
				html = fs.read('speedreport.html');
			}

			f.writeLine(html);

			if (args[1]) {
				f.writeLine('<script src=\"\/rest\/performance\/js\?uuid\=' + myjson + '\"></script>');
			}
			else{
				f.writeLine('<script src=\"' + myjson + '\.js"></script>');
			}

			f.writeLine('\<script\>$j(document).ready(function () {' +
														'var p = new PageModel(reportdata);' +
														'ko.applyBindings(p);' +
														'});');
			f.writeLine('</script>' +
						'</body></html>');


			f.close();

		}
		catch (e) {
			console.log("problem writing to file",e);
		}

	}

	function usage() {
		print();
		print('Usage: speedreport.js <url> <requestType> <output> <useragent>');
		print();
		print("       <requestType> can be 'html' or 'json'.");
		print("       <output> is the name of the output folder ('html') or file ('json').");
		print("       <useragent> is a user-agent name");
		print();
		print("       Also see speed-daemon-config.json");
		print();
	}

	/*
	 * Print a line of output to the console.
	 */
	function print(str) {
		if (!str) {
			str = '';
		}

		console.log(str);
	}

	/*
	 * Merge a config file into the standard config.
	 */
	function mergeConfig(config, configFile) {
		if (!fs.exists(configFile)) {
			configFile = "speedreport/config.json";
		}

		if (!fs.exists(configFile)) {
			configFile = "config.json";
		}

		var result = JSON.parse(fs.read(configFile));

		for (var key in config) {
			result[key] = config[key];
		}

		return result;
	}
})();

speedDaemon.run();
