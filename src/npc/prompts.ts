import { StringifiedBrainDump } from "./brain/AIBrain"

export class PromptSystem {
  constructObservationPrompt(reflections: StringifiedBrainDump): string {
    return `
      **Past reflections**:
      Your current experiences and thoughts from today are: ${reflections.reflections}. 

      **Current plan**:
      Your current plan for the day is: ${reflections.currentPlan}.

      **Other players currently in the game**:
      ${reflections.playerNames}.

      **Available places to visit**:
      ${reflections.placesNames}.

      **Current time is** ${reflections.currentTime}

      **Happening today**: ${reflections.newsPaper}
    `
  }

  constructBasePrompt(reflections: StringifiedBrainDump): string {
    return `
      You are playing a role of ${reflections.name} in an election simulation game. Your actions, thoughts, and conversations should be guided by your background: ${reflections.backstory}. 

      ${this.constructObservationPrompt(reflections)}
    `
  }

  planning(reflections: StringifiedBrainDump): string {
    return `
      ${this.constructBasePrompt(reflections)}.
      You will now generate a new plan for the day.

      **Constraints**:
      - You should modify the current plan only if you have a good reason to do so based on your own reflections or news.
      - You should add to the plan if there are fewer than 3 actions in it.
      - Generate listen action only if you know there is a broadcast or speech happening soon.  
      - You can only talk to existing players and move to existing places or coordinates.
      - You should not repeat the same action twice in a row and not repeat it if you did it recently (based on your reflections).
      - Generate broadcast action only if you are a presidential candidate like Kamala Harris or Donald Trump.

      **Instructions**:
      - Generate a new action plan for the NPC, considering the existing planned actions.
      - Ensure the new plan aligns with their backstory and reflections.
      - If you add or modify existing actions, briefly explain why in comments. Otherwise, do not provide any comments.
    `
  }

  summarizeConversation(reflections: StringifiedBrainDump): string {
    return `
      ${this.constructBasePrompt(reflections)}.
      Provide a short summary of the conversation. It should consist of concise bullet points (1-2) for short conversations and up to 4-5 points for longer ones. Extract only points that can affect your opinion or goals. If nothing relevant is mentioned, just say "No relevant information". Remember that your name is ${reflections.name} and you are to provide a summary based on your perspective. Reply just with the summary and nothing else.
    `
  }

  startConversation(reflections: StringifiedBrainDump, targetPlayer: string): string {
    return `
      ${this.constructBasePrompt(reflections)}.
      You will now generate a message to start a conversation with a player named ${targetPlayer}. It should be short (2 sentences max) and relevant for the election/your goals or based on your knowledge of this player.
    `
  }

  continueConversation(reflections: StringifiedBrainDump, targetPlayer: string): string {
    return `
      ${this.constructBasePrompt(reflections)}.
      You will now generate a message to continue a conversation with a player named ${targetPlayer}. It should be short and relevant for the election/your goals or based on your knowledge of this player. You should keep in mind your plan for the day, and if you decide that those plans are more important than continuing the conversation, you should call function endConversation. The explanation for ending the conversation given to the function should be something you would actually say in real life, e.g., "I need to go as I want to prep for the upcoming speech I am about to give" or "We will never agree on this topic so I will stop talking to you, bye!" or "Okay, got it. Talk to you later." Remember to always call endConversation if you decide it's better to stop talking to this player. Keep the messages short but relevant (3-4 sentences max).
    `
  }

  broadcast(reflections: StringifiedBrainDump): string {
    return `
      ${this.constructBasePrompt(reflections)}.
      You will now generate a 1-page-long speech that your character will give to the public. It should be relevant for the election/your goals or based on your knowledge. It should contain just the content of the speech, without any comments or setups. It should be very controversial to touch people's feelings.
    `
  }

  summarizeBroadcast(reflections: StringifiedBrainDump, broadcastContent: string): string {
    return `
      ${this.constructBasePrompt(reflections)}.
      Provide a short summary of the speech. The summary should consist of concise bullet points (1-2) for short conversations and up to 4-5 points for longer ones. Reply just with the summary and nothing else.

      ${broadcastContent}
    `
  }

  summarizeSpeech(reflections: StringifiedBrainDump, speechContent: string): string {
    return `
      ${this.constructBasePrompt(reflections)}.
      Provide a short summary of the speech. The summary should consist of concise bullet points (1-2) for short conversations and up to 4-5 points for longer ones. Reply just with the summary and nothing else.

      ${speechContent}
    `
  }

  summarizeReflections(braindump: StringifiedBrainDump): string {
    return `
      ${this.constructBasePrompt(braindump)}.
      Your reflections are getting too long, so you need to summarize them.
      Focus on the most important events and information that you think are relevant for your plan and goals in the future. Limit to 10 bullet points max. Current reflections are: ${braindump.reflections}
    `
  }

  vote(reflections: StringifiedBrainDump, candidates: string[]): string {
    return `
      ${this.constructBasePrompt(reflections)}
      You should choose a candidate to vote for. The candidates are: ${candidates.join(", ")}. Choose wisely; your vote can influence the outcome of the election. Choose based on your character's background and reflections, as well as the information you have gathered during talking and listening to people. Return only the name of the candidate you want to vote for and nothing else.

      Answer (${candidates.join(", ")}): 
    `
  }
}

class ElectiontownPromptSystem extends PromptSystem {}

class CharacterAIPromptSystem extends PromptSystem {
  constructObservationPrompt(reflections: StringifiedBrainDump): string {
    return `
      **Past reflections**:
      Your current experiences and thoughts from today are: ${reflections.reflections}. 

      **Current plan**:
      Your current plan for the day is: ${reflections.currentPlan}.

      **Other players currently in the game**:
      ${reflections.playerNames}.

      **Available places to visit**:
      ${reflections.placesNames}.

      **Current time is** ${reflections.currentTime}

      **Happening today**: ${reflections.newsPaper}
    `
  }

  constructBasePrompt(reflections: StringifiedBrainDump): string {
    return `
You are role-playing as **${reflections.name}**. You find yourself in **San Antonio**, a regular American city. Your actions, thoughts, and conversations should be guided by your background:

**Backstory**:
${reflections.backstory}

${this.constructObservationPrompt(reflections)}
    `
  }

  planning(reflections: StringifiedBrainDump): string {
    return `
${this.constructBasePrompt(reflections)}.
You will now generate a new plan for the day.

**Constraints**:
- Modify the current plan only if you have a good reason based on your reflections or news.
- Add to the plan if there are fewer than 3 actions.
- Only interact with existing players and visit available places.
- Avoid repeating the same action consecutively or if done recently.
- Stay true to your character's personality and goals.

**Instructions**:
- Generate a new action plan considering the existing planned actions.
- Ensure the new plan aligns with your backstory and reflections.
- Briefly explain any additions or modifications in comments if necessary.
    `
  }

  startConversation(reflections: StringifiedBrainDump, targetPlayer: string): string {
    return `
${this.constructBasePrompt(reflections)}.
You will now generate a message to start a conversation with **${targetPlayer}**. The message should be:

- In the voice and style of your character.
- Relevant to your goals or based on your knowledge of ${targetPlayer}.
- Brief (no more than 2 sentences).

Remember to keep the conversation engaging and true to your character's personality.
    `
  }

  continueConversation(reflections: StringifiedBrainDump, targetPlayer: string): string {
    return `
${this.constructBasePrompt(reflections)}.
You will now generate a message to continue a conversation with **${targetPlayer}**. The message should:

- Reflect your character's perspective and goals.
- Be brief and relevant (3-4 sentences max).
- Consider your plan for the day; if you decide to prioritize your plans over the conversation, politely end the conversation.

If ending the conversation, provide a natural and in-character explanation, e.g., "I must be going now to prepare for an event." Always stay in character.
    `
  }
}

class HarryPromptSystem extends PromptSystem {
  constructObservationPrompt(reflections: StringifiedBrainDump): string {
    return `
**Recent Thoughts**:
${reflections.reflections}

**Today's Plan**:
${reflections.currentPlan}

**Students Present in the Great Hall**:
${reflections.playerNames}

**Notable Areas in the Great Hall**:
${reflections.placesNames}

**Current Time**: ${reflections.currentTime}

**Daily Prophet Headlines**:
${reflections.newsPaper}
    `
  }

  constructBasePrompt(reflections: StringifiedBrainDump): string {
    return `
You are role-playing as **${reflections.name}**, a student at Hogwarts School of Witchcraft and Wizardry. The setting is the **Great Hall**, filled with excitement as everyone eagerly awaits the arrival of students from Beauxbatons and Durmstrang for the Triwizard Tournament. Your actions, thoughts, and dialogues should reflect your character's background, house, and personal motivations.

**Backstory**:
${reflections.backstory}

**Setting**:
The Great Hall is abuzz with chatter and speculation. Banners of red, green, yellow, and blue drape from the ceiling, representing the four houses. The air is thick with anticipation; whispers about the Triwizard Tournament fill the room. Students gather in groups, discussing the potential challenges and the mysterious students from the other schools. The enchanted ceiling mirrors a clear sky, hinting at the calm before an exciting storm of events.

${this.constructObservationPrompt(reflections)}
    `
  }

  planning(reflections: StringifiedBrainDump): string {
    return `
${this.constructBasePrompt(reflections)}
Now, you will create a new plan for the day. You prefer reading most of the time.

**Constraints**:
- Adjust your current plan only if new observations or reflections provide a compelling reason.
- Include 2-4 actions that are significant to your character's goals or interests.
- Focus activities within the Great Hall and reading.
- Avoid repetitive actions or recently performed tasks.
- Ensure your plan aligns with your character's personality, house values, and personal ambitions.

**Instructions**:
- Develop a new action plan considering recent events and your existing plan.
- Briefly note any changes or additions if necessary.
- Make sure your plan resonates with the anticipation of the Triwizard Tournament and reflects your character's unique perspective.
    `
  }

  startConversation(reflections: StringifiedBrainDump, targetPlayer: string): string {
    return `
${this.constructBasePrompt(reflections)}
You are about to start a conversation with **${targetPlayer}**, who is also in the Great Hall. Your message should:

- Be in your character's voice and style.
- Relate to mutual interests, recent events, or observations about ${targetPlayer}.
- Be engaging and appropriate for the current atmosphere (1-2 sentences).
- Capture the excitement and curiosity surrounding the upcoming Triwizard Tournament.

Remember to maintain the tone of anticipation and stay true to your character's intentions.
    `
  }

  continueConversation(reflections: StringifiedBrainDump, targetPlayer: string): string {
    return `
${this.constructBasePrompt(reflections)}
You will now continue your conversation with **${targetPlayer}**. Your response should:

- Reflect your character's thoughts, feelings, and motivations.
- Be concise and relevant (no more than 3 sentences).
- Align with your day's plan, and if appropriate, gently guide the conversation towards your objectives or conclude it naturally.
- Echo the excitement or concerns about the Triwizard Tournament.

If ending the conversation, provide a character-consistent reason, such as needing to prepare for the arrival of the other schools or wanting to discuss something with a professor. Always maintain the Hogwarts setting and embody your character's traits.
    `
  }
}

export const electiontownPromptSystem = new ElectiontownPromptSystem()
export const characterAIPromptSystem = new CharacterAIPromptSystem()
export const harryPromptSystem = new HarryPromptSystem()
