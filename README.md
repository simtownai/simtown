# ToDo

## top priority

- to idling add subtype (just idling / reading / phone)

- overhearing mechanic for real players

- map

  - 4 rally places
  - voting palce
  - park
  - coffe shop
  - playground

- movement

  - move move action logic to movement controller (finish move action refactor)

  - when was walking to empty place near a person but it became occupied, you should initiate whole movement from scratch instead of recalculatin path

  - rotate to somebody when talking to them

  - writes without finishing movement

  - smooth path recalculation when approaching smbd

    - rm this.pathIndex = closestIndex + 1 // Smoothing the direction after recalculation

  - not coming close enough

  - if user went, let npc know that we left conf

- ai

  - broadcast & listening & talking -> add check if we are in place (and also propagate the emoji updatePlayerData) - did that for talking nowm, let's discuss how to best calcualte the position for all those actions
  - add action reason to the reflection if needed
  - figure out timing of broadcasts and how to make npcs aware about this
  - figure out what happens when 2 npcs decide to talk with each other at the same time
  - create kamala and trump chars

- fix movements to place
- chat interface with other players
  - online status (green/red dot, show both on preview and in chat itself) -- Set of existing player + check in set
  - able to send msg to somebody only if within range (add new property to Chat, like isAllowedToSend)
  - UI
    - buttons: send, resize, close, go to chats
    - messages themselves (add full date like in discord )
  - top right icon to open chat + key C open closest (if no closest then just Chats)
  - check if loading chats from localstorage actually works
  - header is not attached to top of the screen when typing on iphone -> other user's messages are not visible
  - (?)when clicking outside of chat return control to the game
  - add time to msgs
  - group chat for humans
  - preload font
- anonymous loggin with just name
- nice map

## nice to have

- make movements of other players smoother even on high ping
- render chatprompt bubble on top of everything
- login with google
- loading screen
- cache all sprites
- sounds (moving, dependent on terrain; actions, clicks, etc)
- walk behind big tree bushes
- zoom (questionable)
- minimap (maybe with it zoom not needed)
- animations for the world
- hide help container when chat opens and vice versa
- different controls help message for mobile
- enable help menu toggle via "?" but do not listen to it while chat window is opened
