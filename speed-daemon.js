var speedDaemon = new function() {

	var	SPEED_DAEMON_FOLDER = 'speed-daemon';
	var	OUTPUT_FOLDER = 'speed-daemon-reports';
	var HTML_TEMPLATE_FILENAME = 'speed-daemon-template.html';

	var	speedDaemonDefaultConfig =
		{
		    userAgentAliases:
		    	{
					"iphone": "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_0 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8A293 Safari/6531.22.7",
					"android": "Mozilla/5.0 (Linux; U; Android 2.2; en-us; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
					"chrome": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.12 Safari/535.11"
				}
		};

	var	speedDaemonCmdLineContract =
		[
			{
				name:	'url',
				anon:	true,
				req:	true,
				desc:	'is the URL of the page to measure'
			},
			{
				name:	'format',
				def:	'json',
				req:	false,
				desc:	'is the output format to be written',
				oneof:	['html', 'json']
			},
			{
				name:	'out',
				req:	false,
				desc:	'is the output file name to be written'
			},
			{
				name:	'useragent',
				def:	'',
				req:	false,
				desc:	'is the useragent to use when performing the request'
			},
			{
				name:	'config',
				def:	'config.json',
				req:	false,
				desc:	'is a local configuration file of further confess settings'
			},
			{
				name:	'verbose',
				def:	false,
				req:	false,
				desc:	'is a flag indicating whether the script should be chatty'
			}
		];

	var		system = require('system');
	var		fs = require('fs');
	var		page = require('webpage').create();
	var		config;
	var		requests = {};
	var		responses = {};
	var		pageInfo =	{
							assets:		[]
						};

	/*
	 * run() - run the request.
	 */
	this.run = function() {
		var		cmdLineConfig = processArgs(speedDaemonCmdLineContract, usage);

		if (!cmdLineConfig) {
			phantom.exit();
		}

        config = mergeConfig(cmdLineConfig.config, cmdLineConfig);

		if (!config.out) {
			config.out = constructFileNameFromUrl(config.url);
		}

		print();
		print(JSON.stringify(config, null, 4));

		pageInfo.url = config.url;

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

		var		t = Date.now();

		page.open(config.url, function (status) {
			pageInfo.requestTime=t;
			pageInfo.responseTime=Date.now();
			if (status !== 'success') {
				console.log('/* FAIL to load the address */');
			}
			else {
				t = Date.now() - t;

				page.evaluateAsync(
					function() {
							console.log("last chance");
							window.onload = function() {
															console.log(Date.now());
														};
						});

				if (config.format === 'html') {
					printReportToHtml(JSON.stringify(pageInfo, undefined, 4));
				}
				else {
					print("The 'json' format is not currently supported.")
				}

				//page.render(output);
				/*for(var r in requests){
				var start=Date.parse(requests[r].time),end=Date.parse(responses[r].time)
				console.log((end-start)+'ms',responses[r].status, r.substring(0,50));
				}*/
			}
			phantom.exit();
		});
	};

	function printReportToHtml(data) {
		var		fileBaseName;
		var		f;
		var		g;
		var		html;
		var		myfile;
		var		myjson;
		var		jspath;
		var		keys = [];
		var		values = [];
		var		extension = 'html';

		myfile = OUTPUT_FOLDER + '/' + config.out + '.' + extension;
		myjson = config.out;

		if (fs.exists(myfile)) {
			fs.remove(myfile);
		}

		/*
		 * write the headers and first line
		 */
		try {
			f = fs.open(myfile, "w");
			g = fs.open(OUTPUT_FOLDER + '/' + myjson  + '.js', "w");
			g.writeLine('var reportdata = ' + data + ';');
			g.close();

			if(!fs.exists(HTML_TEMPLATE_FILENAME)){
				html = fs.read(SPEED_DAEMON_FOLDER + '/' + HTML_TEMPLATE_FILENAME);
			}
			else{
				html = fs.read(HTML_TEMPLATE_FILENAME);
			}

			f.writeLine(html);

			f.writeLine('<script src=\"' + myjson + '\.js"></script>');

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

	/*
	 * Print a line of output to the console.
	 */
	function print(str) {
		if (!str) {
			str = '';
		}

		console.log(str);
	}

    function processArgs(contract, usageFunc) {
		/*
		 * Element '0' is this script's name.  Remove that.
		 */
		var		args = system.args.slice(1);
        var		elemIndex = 0;
        var		ok = true;
        var		config = clone(speedDaemonDefaultConfig);

        print();
        print(JSON.stringify(args, null, 4));

		while (elemIndex < args.length) {
			var		thisArg = args[elemIndex];

			if (thisArg.indexOf('-') === 0) {
				/*
				 * This is a named param.
				 */
				var		name = thisArg.substr('1');

				if ((elemIndex + 1) < args.length) {
					var		value = args[elemIndex + 1];

					config[name] = value;
					elemIndex += 1;
				}
			}
			else {
				/*
				 * This is an un-named param... look for the next 'anon' param in the contract
				 * that doesn't have a value.
				 */
				for (var contractIndex = 0; contractIndex < contract.length; contractIndex += 1) {
					var		contractItem = contract[contractIndex];

					if (contractItem.anon && !config[contractItem.name]) {
						config[contractItem.name] = thisArg;
					}
				}
			}

			elemIndex += 1;
		}

        contract.forEach(
				function(contractItem) {
					if (contractItem.req && !config[contractItem.name]) {
						print();
						print("👿 '" + contractItem.name + "' argument is required. This " +
									contractItem.desc + '.');
						ok = false;
					}

					if (contractItem.oneof && config[contractItem.name] &&
						(contractItem.oneof.indexOf(config[contractItem.name]) < 0)) {
						print();
						print("👿 '" + contractItem.name + "' argument must be one of: " +
									contractItem.oneof.join(', '));
						print("   '" + config[contractItem.name] + "' isn't.")
						ok = false;
					}

					if (!config[contractItem.name] && contractItem.def) {
						config[contractItem.name] = contractItem.def;
					}
				}
			);

		if (ok) {
			return config;
		}
		else {
			if (typeof usageFunc === 'function') {
				usageFunc();
			}
			return undefined;
		}
	}

	/*
	 * Merge a command-line config file into the command-line config.
	 * (The command-line config takes precedence.)
	 */
	function mergeConfig(configFile, config) {
		if (!fs.exists(configFile)) {
			configFile = "speed-daemon-config.json";
		}

		var		result;

		if (fs.exists(configFile)) {
			result = JSON.parse(fs.read(configFile));
		}
		else {
			result = {};
		}

		for (var key in config) {
			result[key] = config[key];
		}

		return result;
	}

	function constructFileNameFromUrl(url) {
		var		fileBaseName;

		fileBaseName = url.replace('http://','')
						  .replace('https://','')
						  .replace(/\.htm$/, '')
						  .replace(/\//g,'->');
		fileBaseName = fileBaseName.split('?')[0];

		return fileBaseName;
	}

	function clone(obj) {
		if ((obj === null) || (typeof(obj) !== 'object')) {
			return obj;
		}

		var		temp = obj.constructor(); // changed

		for (var key in obj) {
			temp[key] = clone(obj[key]);
		}

		return temp;
	}

	function usage() {
		print();
		print('Usage: speedreport.js');
		print('          -format <html|json>');
		print('          -out <filename>');
		print('          -ua <useragent>');
		print('          -config <configFile>');
		print('          -verbose <true|false>');
		print();
		print("       <format> defaults to 'json'.");
		print("       <filename> is the name of the output folder ('html') or file ('json').");
		print("       <useragent> is a user-agent name.  Supported values include:");
		print("                   iphone, firefox, android, chrome, safari");
		print("       <config-file> is the configuration file to read.  Note that command-line");
		print("                     params override he configuration file.");
		print();
		print("       Also see speed-daemon-config.json");
		print();
	}
};

speedDaemon.run();
