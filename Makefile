# make a variable for the bun executable
BUN := $(HOME)/.bun/bin/bun

update:
	@echo "Update bun dependencies"
	cd $(HOME)/qara/.claude/hooks && $(BUN) update
	cd $(HOME)/qara/.claude/skills/agent-observability/apps/server && $(BUN) update
	cd $(HOME)/qara/.claude/skills/agent-observability/apps/client && $(BUN) update

fabric_setup:
	@echo "Setup Fabric..."
	/home/jean-marc/go/bin/fabric --setup
	@echo "-- done"

launch_agent_observability:
	@echo "Launch Agent Observability..."
	cd $(HOME)/qara/ && ./scripts/start-observability.sh
	@echo "-- done"

kill_agent_observability:
	@echo "Kill Agent Observability..."
	killall bun
	@echo "-- done"