# ToDo

- restore room instance for user private room if exists
- save chats
- add room recreation on server on JoinRoom
- offer to log in
- trying to move on a phone but started at NPC so chat opened
- joystick on a phone dances when holding at one direction
- chat hard to read on a phone
- figure out how chat should look like
- if deleting room instance check if other players are still connected and if yes then delete only your connection
- remove user room connection when room deleted
- improving login with google with icon and name
  - add privacy policy and terms of service URLs (https://console.cloud.google.com/auth/branding?authuser=1&inv=1&invt=AbjQXA&project=simtown-443721)
  - publish and submit app for verification through search console
- deal with empty action list
- if you want to save the account
- change the story of the setup
- finish thread when end conversation or disconnect + fix history logging
- action subset (special room type); to elimiated broadcasting and voting
- custom map + characters for the community
- idling
- uncensored models (try gpt jailbreak)
- tutorial cookie on onboard
- observer interface
  - add past actions
  - add characters icons
- idlining like in generative agents
  - eat
  - rest (idle idle)
- minimap
- creating NPCs

- (Szymon) hunt down TalkAction bugs
  - NPCs are far from each other when start talking
- (Szymon) Optimize prompts
  - listen actions generated when nobody is announced broadcasting at place
  - Going out of character NPC ("as an AI roleplaying NPC")
  - "Player228 decided to end the conversation"
  - NPC's shouldn't broadcast
  - "Player8361 emphasized the urgency to vote, and I need to focus on my upcoming broadcast."
  - "Moving to the Stadium for an important broadcast."
- (Szymon) give NPC's sense of time to prompt
- reflections are gigantic
- unable to generate plan because of errors (like no broadcast announced), but doenst pay atention to that, generates same shit every time and reaches max attempts

- enter username + save in local storage
- add discord
- (Alex) player rotations (on client)
  - rotate to whom you are sending messages
  - rotate to incoming messages if idle
- (Alex) player can only write to NPC if within range

- laggy on weak devices
  - on android mobile, there is a black background instead of a map when using WebGL renderer
  - `WARNING: texture bound to texture unit 0 is not renderable. It might be non-power-of-2 or have incompatible texture filtering (maybe)?`
  - This happens because tileset image `assets/tiles/modernexteriors/Modern_Exteriors_16x16/Modern_Exteriors_Complete_Tileset.png` is 2816x6304 which is bigger than 4096
  - so weak devices now use canvas instead of webgl, but canvas is inefficient
- Freeze on movement
  - probably because no actions left
- Generate first message with the talk action
- **refactor planning**
  - problem: new actions objects override old actions objects even they are exactly the same
  - problem: they manually generate move action before some other action which is already implies movement (e.g. move to voting place before vote) -> then they move there, reflect and decide not to vote
  - it has no ability NOT to change current plan
  - `generatePlanAndSetActions` create new action queue and algorithmically merge the two plans, then insert actions
    - this should fix multiple broadcasting emits after resume, because we regenerated the same broadcast task after dialogue and reflection and technically it's a new task (this is currently fixed with `broadcastAnnouncementsCache`)
  - add time & duration to the plan
  - support arbitrary actions (e.g. take a shower, cook breakfast, etc -- only location and time needed)
- gpt generate a reason for every action
- generic OpenAI loop
  - feed prompt, messages and tools, returns result; handles function calls arguments retries; use for generating actions, messaages and voting
  - voting bad because it is not a tool call so it might not be one of candidates
- Plausible analytics
- NPC's thinking as a separate action
- Generate reason for actions when generating the plan
- Black screen on mobile
- add start time to the plan (maybe not need?)
- move action sometimes fails without emitting that it was over
- end NPC movement only on grid
- `emitUpdatePlayerData` sends new state to everybody but doesn't update player itself
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
