update:
	cd $(HOME)/qara/.claude/hooks && bun update
	cd $(HOME)/qara/.claude/skills/agent-observability/apps/server && bun update
	cd $(HOME)/qara/.claude/skills/agent-observability/apps/client && bun update

fabric_setup:
	@echo "Setup Fabric..."
	fabric --setup
	@echo "-- done"