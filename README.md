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

- ai

  - broadcast & listening & talking -> add check if we are in place (and also propagate the emoji updatePlayerData)
  - figure out timing of broadcasts and how to make npcs aware about this
  - figure out what happens when 2 npcs decide to talk with each other at the same time
  - create kamala and trump chars
  - handle multiple newmessages from a single user when npc is busy (currently we continue on adding to the quee of things to do)

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
