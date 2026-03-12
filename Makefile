install:
	npm ci

install-dev:
	npm ci

compile:
	npm run compile

package:
	npx vsce package

install-vsix:
	code --install-extension $(ls *.vsix)

release: install-dev compile package

clean:
	rm -rf out/ node_modules/ *.vsix

.PHONY: install install-dev compile package install-vsix release clean