BUN := $(shell which bun)

update:
	@echo "Update bun dependencies"
	cd $(HOME)/qara/.claude/hooks && $(BUN) update

fabric_setup:
	@echo "Setup Fabric..."
	fabric --setup
	@echo "-- done"