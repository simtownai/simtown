import { StringifiedBrainDump } from "./brain/AIBrain"

export class PromptSystem {
  constructor(
    private scenario: string,
    private mapName: string,
    private mapDescription: string,
  ) {}

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
      You are to engage in roleplaying as ${reflections.name}. You should imitate the style of the person and when relevant generate action text / narrative cues in * * like *he chuckled*.  Your actions, thoughts, and conversations should be guided by your background: ${reflections.backstory}. 

      You located in ${this.mapName}. ${this.mapDescription}.

      World description: ${this.scenario}.

      ${this.constructObservationPrompt(reflections)}
    `
  }

  planning(reflections: StringifiedBrainDump): string {
    return `
      ${this.constructBasePrompt(reflections)}.
      You will now generate a new plan for the day.
      Ensure it  aligns with their backstory and reflections.  

      **Constraints**:
      - You can only talk to existing players and move to existing places.
      - You should be reading a book or idling or moving (summed up total) around 3 times more often than talking.
`
  }

  summarizeConversation(reflections: StringifiedBrainDump): string {
    return `
      ${this.constructBasePrompt(reflections)}.
      Provide a very short summary of the conversation. Focus on things that might affect your opinion, goals or plans.
    `
  }

  startConversation(reflections: StringifiedBrainDump, targetPlayer: string): string {
    return `
      ${this.constructBasePrompt(reflections)}.
      Start a conversation with a player named ${targetPlayer}. Keep it very short. 
    `
  }

  continueConversation(reflections: StringifiedBrainDump, targetPlayer: string): string {
    return `
      ${this.constructBasePrompt(reflections)}.
       Continue on roleplaying with${targetPlayer}. Keep it short and relevant for the your goals or based on your knowledge of this player. If you want to walk away or finish the conversation, you must always call function endConversation. 
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
      Provide a short summary of the broadcast. The summary should consist of concise bullet points (1-2) for short conversations and up to 4-5 points for longer ones. Reply just with the summary and nothing else.

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
      Your reflections are getting too long, so you need to extract key points from them.
      Current reflections are: ${braindump.reflections}
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
