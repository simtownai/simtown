# ToDo

- (Szymon) NPCs are approaching other's to talk but not talking

  - happens because of replanning after walking
  - add flag to action to have the ability NOT to reflect after action
  - add this flag to movemenets that we insert manually to talk/listen/broadcast

- (Szymon) if no incoming message for 15 sec in listening then end listening action

- (Szymon) split messages sending

  - send them 1 sensentence by 1 sentence with a delay dependent on sensense size
  - reply only after 5 seconds since last message; reply to combined last messages (not just the last one)

- (Szymon) give NPC's sense of time to prompt and add start time to the plan

- (Alex) newspaper on server

  - players emit there (when plan to broadcast for example)
  - it sends it to everyone
  - on join send whole newsletter to client
  - time/description/place?
  - embed newspaper to NPC prompt
  - embed newspaper to the UI of player

- (Alex) rotate to somebody when talking to them (embed in broadcast & listen as well)

- (Alex) Separate area for broadcaster and listeners

- (Alex) add `username-read` animation propagation to idle task (set animation at start and go back to default idle animation on interupt/end)

- (Alex) manage map completion

- Optimize prompts

- NPC's initialization desync (minor) (when we haven't received info about ourselves but already receiving other players updates)

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
- anonymous loggin with just name

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
