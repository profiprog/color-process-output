#!/usr/bin/env node
"use strict";

let {spawn} = require('child_process');
let none = () => {};
let now = () => new Date();

function runProc(cmd, options) {
	const opts  = {
		stdout: process.stdout.write.bind(process.stdout),
		stderr: process.stderr.write.bind(process.stderr),
		error: undefined,
	};
	let childOpts = { stdio: [ 'inherit', 'pipe', 'pipe' ] };
	for (let key of Object.keys(options)) (opts.hasOwnProperty(key) ? opts : childOpts)[key] = options[key];
	return new Promise((resolve, reject) => {
		let proc = spawn(cmd[0], cmd.slice(1), childOpts);
		proc.stdout.setEncoding('utf8'); proc.stdout.on('data', opts.stdout);
		proc.stderr.setEncoding('utf8'); proc.stderr.on('data', opts.stderr);
		proc.on('close', code => {
			if (code) reject(code);
			else resolve(code);
		});
		proc.on('error', e => {
			(opts.error || opts.stderr)(e.toString());
		});
	});
}


const substitutions = {
	t: () => formatTime(now()),
	T: () => formatTime(now(), 6),
};

const substituteDynamic = (label, opts) => label.replace(/%([%tT])/g, (m0, m1) => {
	if (substitutions[m1]) m1 = substitutions[m1](opts);
	return m1;
});

const mark = (stream, label, opts) => str => {
	let lines = str.split(/\r?\n/g);
	if (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop();
	let resolved = substituteDynamic(label, opts);
	stream(lines.map(_ => `${resolved}${_}`).join("\n")+"\n");
};

const tee = (...streams) => chunk => streams.forEach(stream => stream(chunk));

const wrap = (stream, color) => str => stream(str.split(/\r?\n/g).map(_ => _ ? color(_) : _).join('\n'));

const color = {
	black: v => `\x1b[30m${v}\x1b[0m`,
	red: v => `\x1b[31m${v}\x1b[0m`,
	green: v => `\x1b[32m${v}\x1b[0m`,
	yellow: v => `\x1b[33m${v}\x1b[0m`,
	blue: v => `\x1b[34m${v}\x1b[0m`,
	magenta: v => `\x1b[35m${v}\x1b[0m`,
	cyan: v => `\x1b[36m${v}\x1b[0m`,
	ligthGray: v => `\x1b[37m${v}\x1b[0m`,
	darkGray: v => `\x1b[90m${v}\x1b[0m`,
	ligthRed: v => `\x1b[91m${v}\x1b[0m`,
	ligthGreen: v => `\x1b[92m${v}\x1b[0m`,
	ligthYeallow: v => `\x1b[93m${v}\x1b[0m`,
	ligthBlue: v => `\x1b[94m${v}\x1b[0m`,
	ligthMagenta: v => `\x1b[95m${v}\x1b[0m`,
	ligthCyan: v => `\x1b[96m${v}\x1b[0m`,
	white: v => `\x1b[97m${v}\x1b[0m`,
	custom: (...codes) => v => `\x1b[${codes.join(';')}m${v}\x1b[0m`,
	bgBlack: v => `\x1b[40m${v}\x1b[0m`,
	bgRed: v => `\x1b[41m${v}\x1b[0m`,
	bgGreen: v => `\x1b[42m${v}\x1b[0m`,
	bgYellow: v => `\x1b[43m${v}\x1b[0m`,
	bgBlue: v => `\x1b[44m${v}\x1b[0m`,
	bgMagenta: v => `\x1b[45m${v}\x1b[0m`,
	bgCyan: v => `\x1b[46m${v}\x1b[0m`,
	bgLigthGray: v => `\x1b[47m${v}\x1b[0m`,
	bgDarkGray: v => `\x1b[100m${v}\x1b[0m`,
	bgLigthRed: v => `\x1b[101m${v}\x1b[0m`,
	bgLigthGreen: v => `\x1b[102m${v}\x1b[0m`,
	bgLigthYeallow: v => `\x1b[103m${v}\x1b[0m`,
	bgLigthBlue: v => `\x1b[104m${v}\x1b[0m`,
	bgLigthMagenta: v => `\x1b[105m${v}\x1b[0m`,
	bgLigthCyan: v => `\x1b[106m${v}\x1b[0m`,
	bgWhite: v => `\x1b[107m${v}\x1b[0m`,
};

let formatCmd = cmd => cmd.map(_ =>
	_.replace(/\\./g, '').replace(/((')[^']+'|(")[^"]+")/g, '$2$2$3$3').indexOf(' ') >= 0 ? `"${_}"` : _).join(' ');

Object.assign(module.exports = runProc, { runProc, mark, tee, wrap, color });

let formatTime = (_, f = 0, t = 13) => [ _.getFullYear(),
		'-' , ("0" + (_.getMonth() + 1)).substr(-2),
		'-' , ("0" + _.getDate()).substr(-2),
		' ' , ("0" + _.getHours()).substr(-2),
		':' , ("0" + _.getMinutes()).substr(-2),
		':' , ("0" + _.getSeconds()).substr(-2),
		'.' , ("00" + _.getMilliseconds()).substr(-3) ].slice(f, t).join('');


if (require.main === module) {
	const path = require('path');

	let fail = (msg, exitCode = 1) => {
		console.error("Error: " + msg);
		process.exit(exitCode);
	};

	let helpOpts = [ '--help', '-h', '-?' ];
	let opts = {
		"+<splitchar><args>": "split <args> by <splitchar> into multiple arguments",
		"-l": "alias of \x1b[1;37m--label\x1b[0m",
		"--label": `prefix of output.
	For example: \x1b[1;37m--label \x1b[1;36mbackup\x1b[0m create prefix:
	\x1b[32mbackup>\x1b[0m for stdout
	and
	\x1b[31mbackup>\x1b[0m for stderr
	Default is base name of command.
	Labels can also contains special placeholders: 
		\x1b[35m%t\x1b[0m will be expanded to timestamp (like 2019-05-15 17:44:25.748)
		\x1b[35m%T\x1b[0m will be expanded to time (liek 17:44:25.748)
		\x1b[35m%%\x1b[0m will be replaced single '%'`,
		"-e": `Print prefixed stdout to stderr and print stdout normally.
	It's handy if stdout is captured like: VAL="$(${path.basename(process.argv[1])} md5 "$FILE")"`,
		"-0": `Do not print prefixed stdout, neither to stdout or stderr`
	};
	let printHelp = () => {
		const optsSep = '\n    ';
		console.log("Usage:", process.argv.slice(0, 2).map(_ => path.basename(_)).join(' '), "[OPTONS] COMMAND [...ARGS]");
		console.log("Options:" + optsSep + Object.keys(opts).map(param => `\x1b[1;37m${param}\x1b[0m ${opts[param]||'?'}`).join(optsSep));
		process.exit(0);
	};

	let cmd = process.argv.slice(2);
	let label, protectStdout = false, hideStdout = false;
	while (cmd.length && (cmd[0].charAt(0) === '-' || cmd[0].charAt(0) === '+')) {
		if (cmd[0].charAt(0) === '+') { cmd.splice(0, 1, ...cmd[0].substr(2).split(cmd[0].charAt(1))); continue; }
		if (helpOpts.indexOf(cmd[0]) >= 0) printHelp();
		if (cmd[0] === '--') { cmd.shift(); break; }
		if (cmd[0] === '-l' || cmd[0] === '--label') { label = cmd.splice(0, 2)[1]; continue; }
		if (cmd[0] === '-e') { protectStdout = !!cmd.shift(); continue; }
		if (cmd[0] === '-0') { hideStdout = !!cmd.shift(); continue; }
		fail("Unknown option " + cmd[0], 404);
	}
	if (label === undefined) label = path.basename(cmd[0]);

	let stdout = process.stdout.write.bind(process.stdout);
	let stderr = process.stderr.write.bind(process.stderr);

	let formattedCommand = color.ligthYeallow(formatCmd(cmd));
	if (label.indexOf('%T') >= 0) formattedCommand += color.darkGray(` (started on ${formatTime(now(), 0, 5)})`);
	if (label) mark(protectStdout ? stderr : stdout, color.white(label + ': '))(formattedCommand);
	runProc(cmd, {
		stdout: hideStdout ?
			none : protectStdout ?
				tee(stdout, label ? mark(stderr, color.green(label + '> ')) : wrap(stderr, color.green)) :
				label ? mark(stdout, color.green(label + '> ')) : wrap(stdout, color.green),
		stderr: label ? mark(stderr, color.red(label + '> ')) : wrap(stderr, color.red),
		error: wrap(label ? mark(stderr, color.white(label + ': ')) : stderr, color.red),
	}).catch(e => {
		if (typeof e === 'number') {
			(label ? wrap(mark(stderr, color.white(label + ': ')), color.red) : wrap(stderr, color.white))
			(`process exited with status_code: ${e}\n`);
			return e;
		}
		console.error(e); return 1;
	}).then(_ => process.exit(_));
}
