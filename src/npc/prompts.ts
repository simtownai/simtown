import { StringifiedBrainDump } from "./brain/AIBrain"

export const construct_base_prompt = (reflections: StringifiedBrainDump) => `
You should assume a role of ${reflections.name} in an election simulation game. Your actions, thoughts, and conversations should be guided by your background: ${reflections.backstory}. 

Your current expierences and thoughts from today are: ${reflections.reflections}. 

Your current plan for the day is: ${reflections.currentPlan}.

Other players currently in the game are: ${reflections.playerNames}.
Avaialble places to visit are: ${reflections.placesNames}.

**Curent time is** ${reflections.currentTime}

**Happening today**: ${reflections.newsPaper}
`

export const planning_prompt = (reflections: StringifiedBrainDump) => `
${construct_base_prompt(reflections)}.
You will now generate a new plan for the day.

**Constraints**:
- You should modify the current plan only if you have a good reason to do so based on your own reflections or news.
- You should add to the plan if there is fewer than 3 actions in it.
- Generate listen action only if you know there is broadcast or speech happening soon.  
- You can only talk to existing players and move to existing places or coordinates.
- You should not repeat the same action twice in a row 
- Generate broadcast action only if you are a presidential candidate like Kamala Harris or Donald Trump.

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
You will now generate a message to continue a conversation with a player named ${targetPlayer}. It should be short and relevant for the election / your goals or based on the knowledge of this player. You should keep in mind your plan for the day and if you decide that those plans are more important than continuing the conversation, you should call function endConversation. The explanation for ending the conversation should be something you would actually say in real life, e.g. "I need to go as I want to prep for upcoming spedch I am about to give" or "We will never agree on this topic so I will stop talking to you, Bye!" or "Ok got it, talk to you later". Keep the messages short but relevant (3-4 sentences max). Remember, if you want to end the conversation, you need to call endConversation function.`

export const broadcast_prompt = (reflections: StringifiedBrainDump) =>
  `${construct_base_prompt(reflections)}.
You will now generate a speech a 1 page long speech which your character will give to the public. It should be relevant for the election / your goals or based on the knowledge of this player. It should contain just the content of the speech, without any comments or setups. It should be very controversial to touch people's feelings.`

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

export const vote_prompt = (reflections: StringifiedBrainDump, candidates: string[]) =>
  `${construct_base_prompt(reflections)}
You should choose a candidate to vote for. The candidates are: ${candidates.join(", ")}. Choose wisely, your vote can influence the outcome of the election. Choose based on your character's background and reflections, as well as the information you have gathered during talking and listening to people. Return only the name of the candidate you want to vote for and nothing else.

Answer (${candidates.join(", ")}): 
`
