# ToDo

- (Szymon) NPC's approaching player and each other to talk but not actually talk
- (Szymon) hunt down TalkAction bugs
- (Szymon) Split broadcast speech also by sensences, not by characters
- (Szymon) give NPC's sense of time to prompt and add start time to the plan (maybe not need?)
- (Szymon) add the voting action
- (Szymon) summarize long reflections

- (Alex) manage map completion
  - walk behind the bushes
- (Alex) Separate area for broadcaster and listeners:
  - rotate broadcaster to center of listening area (socketmanager)
- (Alex) end NPC movement only on grid
- (Alex) player can only write to NPC if within range

- `emitUpdatePlayerData` sends new state to everybody but doesn't update player itself
- When NPC initiate broadcast action they can do it multiple times
- Optimize prompts
- log everything to database
  - NPC's state
  - messages
- movement bugs
  - writes without finishing movement
  - smooth path recalculation when approaching smbd
    - rm this.pathIndex = closestIndex + 1 // Smoothing the direction after recalculation
  - if user went away, let npc know that we left conversation
- chat interface with other players
  - online status (green/red dot, show both on preview and in chat itself) -- Set of existing player + check in set
  - Somebody is typing status
  - able to send msg to somebody only if within range (add new property to Chat, like isAllowedToSend)
  - check if loading chats from localstorage actually works
  - header is not attached to top of the screen when typing on iphone -> other user's messages are not visible
  - (?)when clicking outside of chat return control to the game
  - group chat for humans
- anonymous login with just name

## nice to have

- login with google
- different controls help message for mobile
- make movements of other players smoother even on high ping
- sounds (moving, dependent on terrain; actions, clicks, etc)
- zoom (questionable)
- cache all sprites
- minimap (maybe with it zoom not needed)
- animations for the world
- hide help container when chat opens and vice versa
- enable help menu toggle via "?" but do not listen to it while chat window is opened
- walk behind big tree bushes
