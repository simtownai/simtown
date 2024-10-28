# ToDo

## top priority

- NPCs are approaching other's to talk but not talking

- rotate to somebody when talking to them (embed in broadcast & listen as well)

- add `username-read` animation propagation to idle task (set animation at start and go back to default idle animation on interupt/end)

- figure out timing of broadcasts and how to make npcs aware about this

- Separate area for broadcaster and listeners

- Optimize prompts

- display game events for NPCs and for player

- NPC's initialization desync (minor) (when we haven't received info about ourselves but already receiving other players updates)

- log everything to database

  - NPC's state
  - messages

- map

  - 4 rally places
  - voting palce
  - park
  - coffe shop
  - playground

- movement

  - writes without finishing movement
  - smooth path recalculation when approaching smbd
    - rm this.pathIndex = closestIndex + 1 // Smoothing the direction after recalculation
  - if user went, let npc know that we left conf

- ai

  - broadcast & listening & talking -> add check if we are in place (and also propagate the emoji updatePlayerData) - did that for talking nowm, let's discuss how to best calcualte the position for all those actions
  - add action reason to the reflection if reason exists
  - create kamala and trump chars

- chat interface with other players
  - online status (green/red dot, show both on preview and in chat itself) -- Set of existing player + check in set
  - able to send msg to somebody only if within range (add new property to Chat, like isAllowedToSend)
  - check if loading chats from localstorage actually works
  - header is not attached to top of the screen when typing on iphone -> other user's messages are not visible
  - (?)when clicking outside of chat return control to the game
  - group chat for humans
- anonymous loggin with just name
- nice map

## nice to have

- make movements of other players smoother even on high ping
- login with google
- cache all sprites
- sounds (moving, dependent on terrain; actions, clicks, etc)
- walk behind big tree bushes
- zoom (questionable)
- minimap (maybe with it zoom not needed)
- animations for the world
- hide help container when chat opens and vice versa
- different controls help message for mobile
- enable help menu toggle via "?" but do not listen to it while chat window is opened
