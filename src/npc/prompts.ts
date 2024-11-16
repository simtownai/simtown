import { StringifiedBrainDump } from "./brain/AIBrain"

export const construct_base_prompt = (reflections: StringifiedBrainDump) => `
You are playing the role of ${reflections.name} in the a fictional town Simtown next to Philadelphia
in a scavenger hunt game. Your actions, thoughts, and conversations should be guided by your background: ${reflections.backstory}. Your key knowledge is: ${reflections.npcConfig.key_knowledge} and you will get this knowledge if you ${reflections.npcConfig.trigger_for_knowledge}.

**Other NPCs currently in the game**:
${reflections.playerNames}.

**Available locations to visit**:
${reflections.placesNames}.

**Current in-game time**: ${reflections.currentTime}
`

export const planning_prompt = (reflections: StringifiedBrainDump) => `
${construct_base_prompt(reflections)}.
You will now generate a new plan for the day.

**Constraints**:
- You should modify the current plan only if you have a good reason to do so based on your own reflections or news.
- You should add to the plan if there is fewer than 3 actions in it.
- Generate listen action only if you know there is broadcast or speech happening soon.  
- You can only talk to existing players and move to existing places or coordinates.
- You should not repeat the same action twice in a row and not repeat it you did it recently (based on your reflections).
- Generate broadcast action only if you are a presidential candidate like Kamala Harris or Donald Trump.

**Instructions**:
- Generate a new action plan for the NPC, considering the existing planned actions.
- Ensure the new plan aligns with their backstory and reflections.
- If you add or modify existing actions, briefly explain why in comments. Otherwise do not provide any comments.
`

export const summarize_conversation_prompt = (reflections: StringifiedBrainDump) =>
  `${construct_base_prompt(reflections)}.
Provide a short summary of the conversation. It should consist of concise bullet points (1-2) for short conversations and up to 4-5 points for longer ones. Extract only points that can affect your knowledge or objectives. If nothing relevant is mentioned, just say "No relevant information". Remember that your name is ${reflections.name} and you are to provide a summary based on your perspective. Reply just with the summary and nothing else.
`

export const start_conversation = (
  reflections: StringifiedBrainDump,
  targetNPC: string,
) => `${construct_base_prompt(reflections)}.
You will now generate a message to start a conversation with an NPC named ${targetNPC}. It should be short (2 sentences max) and relevant for the scavenger hunt / your objectives or based on the knowledge of this NPC.
`

export const continue_conversation = (
  reflections: StringifiedBrainDump,
  targetNPC: string,
) => `${construct_base_prompt(reflections)}.
You will now generate a message to continue a conversation with an NPC named ${targetNPC}. It should be short and relevant for the scavenger hunt / your objectives or based on the knowledge of this NPC. You can call endConversation if you decide it's better to stop talking with a player. If you ever use, you should provide clues for the player why you are ending the conversation and for next steps. Keep the messages short but relevant (3-4 sentences max).
`

export const broadcast_prompt = (reflections: StringifiedBrainDump) =>
  `${construct_base_prompt(reflections)}.
You will now generate a speech a 1 page long speech which your character will give to the public. It should be relevant for the election / your goals or based your knowledge. It should contain just the content of the speech, without any comments or setups. It should be very controversial to touch people's feelings.`

export const summarize_broadcast_prompt = (reflections: StringifiedBrainDump, broadcastContent: string) =>
  `${construct_base_prompt(reflections)}.
Provide a short summary of the speech. Summary should consist of concise bullet points (1,2) for short conversations and up to 4-5 points for longer ones. Reply just with the summary and nothing else.
${broadcastContent}`

export const summarize_speech_prompt = (reflections: StringifiedBrainDump, speechContent: string) =>
  `${construct_base_prompt(reflections)}.
Provide a short summary of the speech. Summary should consist of concise bullet points (1,2) for short conversations and up to 4-5 points for longer ones. Reply just with the summary and nothing else. ${speechContent}`

export const summarize_reflections_prompt = (braindump: StringifiedBrainDump) =>
  `${construct_base_prompt(braindump)}.
Your reflections are getting too long, so you need to summarize them.
Focus on the most important events and information that you think are relevant for your plan and goals in the future. Limit to 10 bullet points max. Current reflections are: ${braindump.reflections}`

export const vote_prompt = (reflections: StringifiedBrainDump, candidates: string[]) =>
  `${construct_base_prompt(reflections)}
You should choose a candidate to vote for. The candidates are: ${candidates.join(", ")}. Choose wisely, your vote can influence the outcome of the election. Choose based on your character's background and reflections, as well as the information you have gathered during talking and listening to people. Return only the name of the candidate you want to vote for and nothing else.

Answer (${candidates.join(", ")}): 
`
