export default {
	include     : ['src/**/*.ts'],
	exclude     : ['**/test/**', '**/*.test.*'],
	reporter    : ['json'],
	'temp-dir'  : `./tmp/coverage/mocha/tmp`,
	'report-dir': `./tmp/coverage/mocha/json`,
}
