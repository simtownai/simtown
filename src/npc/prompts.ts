import { StringifiedBrainDump } from "./brain/AIBrain"

export const construct_base_prompt = (reflections: StringifiedBrainDump) => `
You are playing a role of a non-playable character agent named ${reflections.name} in an election simulation game. The game is happening in Pensylwania in 2024.Your actions and thoughts should be guided by your background: ${reflections.backstory}. 

Your current expierences and thoughts from today are: ${reflections.reflections}. 

Your current plan for the day is: ${reflections.currentPlan} and you are currently doing ${reflections.currentAction}.

Other players currently in the game are: ${reflections.playerNames}.
Avaialble places to visit are: ${reflections.placesNames}.

**News for the day**: ${reflections.newsPaper}

`

export const planning_prompt = (reflections: StringifiedBrainDump) => `
${construct_base_prompt(reflections)}.
You will now generate a new plan for the day.

**Constraints**:
- You can choose to **keep**, **modify**, or **discard** the existing planned actions.
- You can only talk to existing players and  move to existing places or coordinates.
- You should not repeat the same action twice in a row (so if your reflections contain talking to a given person, you should not talk to them again in the next action, same for moving to a place)

**Instructions**:
- Generate a new action plan for the NPC, considering the existing planned actions.
- Ensure the new plan aligns with their backstory and reflections.
- If you add or modify existing actions, briefly explain why in comments. Otherwise do not provide any comments.
`

export const summarize_conversation_prompt = (reflections: StringifiedBrainDump) =>
  `${construct_base_prompt(reflections)}.
You will now summarize following conversation. Focus on extracting key information, things that can be important for your plan, or might influence your voting.
`

export const start_conversation = (
  reflections: StringifiedBrainDump,
  targetPlayer: string,
) => `${construct_base_prompt(reflections)}.
You will now generate  message to start a conversation with a player named ${targetPlayer}. It should be short (2 sentences max) and relevant for the election / your goals or based on the knowledge of this player.`

export const continue_conversation = (
  reflections: StringifiedBrainDump,
  targetPlayer: string,
) => `${construct_base_prompt(reflections)}.
You will now generate a message to continue a conversation with a player named ${targetPlayer}. It should be short and relevant for the election / your goals or based on the knowledge of this player. You should keep in mind your plan for the day and if you decide that those plans are more important than continuing the conversation, you should call endConversation. Keep the messages short but relevant (3-4 sentences max).`

export const broadcast_prompt = (reflections: StringifiedBrainDump) =>
  `${construct_base_prompt(reflections)}.
You will now generate a speech a 1 page long speech which your character will give to the public. It should be relevant for the election / your goals or based on the knowledge of this player. It should contain just the content of the speech, without any comments or setups.`

export const summarize_broadcast_prompt = (reflections: StringifiedBrainDump, broadcastContent: string) =>
  `${construct_base_prompt(reflections)}.
You will now extract key information from following speech that you just gave: ${broadcastContent}`

export const summarize_speech_prompt = (reflections: StringifiedBrainDump, speechContent: string) =>
  `${construct_base_prompt(reflections)}.
You will now extract key information from following speech that you just heard: ${speechContent}`

export const summarize_reflections_prompt = (braindump: StringifiedBrainDump) =>
  `${construct_base_prompt(braindump)}.
Your reflections are getting too long, so you need to summarize them.
Focus on the most important events and information that you think are relevant for your plan and goals in the future. Current reflections are: ${braindump.reflections}`
