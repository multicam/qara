# make a variable for the bun executable
BUN := $(HOME)/.bun/bin/bun

update:
	@echo "Update bun dependencies"
	cd $(HOME)/qara/.claude/hooks && $(BUN) update
	cd $(HOME)/qara/.claude/skills/agent-lens/apps/server && $(BUN) update
	cd $(HOME)/qara/.claude/skills/agent-lens/apps/client && $(BUN) update

fabric_setup:
	@echo "Setup Fabric..."
	/home/jean-marc/go/bin/fabric --setup
	@echo "-- done"

launch_agent_lens:
	@echo "Launch Agent Lens..."
	cd $(HOME)/qara/ && ./scripts/start-agent-lens.sh
	@echo "-- done"

kill_agent_lens:
	@echo "Kill Agent Lens..."
	killall bun
	@echo "-- done"