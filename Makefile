install:
	npm ci

compile:
	npm run compile

package:
	npx vsce package

install-vsix:
	code --install-extension $(ls *.vsix)

release: install compile package

clean:
	rm -rf out/ node_modules/ *.vsix

.PHONY: install compile package install-vsix release clean