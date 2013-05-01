# speed-daemon
[PhantomJS](http://www.phantomjs.org/) 1.6+ is required to run loadreport.js or speedreport.js.

Usage
-----
`phantomjs speed-daemon.js <format> <url>`

* `<format>` is optional and specifies what should be written ('html' or 'json')
* `url` is the URL to be analyzed.

In addition, the following parameters may be specified...

* `-config <config-file>` specifies an external config file to be used
* `-out <out-file>` specifies the base name of the output file to be written (i.e., 'my-report').  If not
	specified, defaults to a modified version of the url.
* `-ua <user-agent>` specifies the user agent to use.  Supported user agents include 'firefox', 'safari', 'chrome', iphone', and 'android'.

Origins
-------
The speed-daemon script started life as James Pearce'
[Confess](https://github.com/jamesgpearce/confess),
and was then modified by Wesley Hales who added the
[speedreport.js](https://github.com/wesleyhales/loadreport) magic.
This fork is focussed on using speedreport.js as part of a larger
process of gathering metrics on web pages.