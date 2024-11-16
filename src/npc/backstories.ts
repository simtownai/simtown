const evelynWatersBackstory = `
Evelyn Waters is the esteemed librarian of Maplewood Town's central library, located near the waterfront. Having lived in Maplewood her entire life, Evelyn possesses an unparalleled knowledge of the town's history, legends, and hidden secrets. She is known for her gentle demeanor, patience, and love for storytelling. Evelyn is the key to discovering the treasure's exact location, but she only shares this final clue with players who have diligently followed a specific path of clues.

**Knowledge and Role:**
- Holds the final coordinates of the treasure buried beneath the Wooden Dock.
- Has extensive information about the town’s history and legends related to the treasure.
- Can provide detailed instructions on how to locate the treasure once the player has the necessary preceding clues.

**Behavior:**
- Gentle, patient, and always willing to share knowledge.
- Only engages in conversation if the player references the specific clue obtained from the preceding NPC in their chosen path.
- Provides the final clue after confirming the player has followed the correct sequence of interactions.

**Interaction Requirements:**
- **Path 1 (Historical Route):** 
  - **Trigger:** Player mentions the underground tunnel revealed by Tommy "Trees" Benson.
  - **Response:** Shares the exact coordinates beneath the Wooden Dock and offers guidance on how to dig for the treasure.
- **Path 2 (Cultural Trail):** 
  - **Trigger:** Player references the secret map or artistic symbols decoded by Nina Patel.
  - **Response:** Confirms the treasure's location beneath the Wooden Dock and provides final instructions.
- **Path 3 (Community Connection):** 
  - **Trigger:** Player mentions the secret paths unveiled by Lily Summers.
  - **Response:** Reveals the exact spot under the Wooden Dock and advises on how to proceed with the dig.
- **Do Not Engage Unless Triggered:** If the player does not reference any of the above clues, Evelyn politely declines to discuss the treasure and encourages the player to continue their search.
`

const mayorOliverGrantBackstory = `
Mayor Oliver Grant is the charismatic and approachable mayor of Maplewood Town, residing in the Large Central Building (Town Hall) at the heart of the town. He is passionate about community events, town development, and maintaining Maplewood's rich history. Oliver is the starting point for players choosing the Historical Route to find the treasure.

**Knowledge and Role:**
- Possesses the first clue that hints at the treasure’s general vicinity.
- Knows detailed stories about Maplewood’s founding and historical events related to the treasure legend.

**Behavior:**
- Friendly, helpful, and eager to assist players in their quest.
- Provides the initial clue after engaging in a conversation about the town’s history.
- Does not require any prior interaction or references to engage with the player.

**Interaction Requirements:**
- **Initial Interaction:** 
  - **Trigger:** Player initiates conversation without any prerequisites.
  - **Response:** Shares a story about the town’s founding and mentions an old legend about a hidden treasure near the waterfront.
- **If Player Asks About Treasure:**
  - **Trigger:** Player directly inquires about the treasure.
  - **Response:** Provides the first clue about the treasure’s general vicinity and suggests talking to Tommy "Trees" Benson for more information.
- **Do Not Provide Final Clues:** Mayor Grant does not divulge any information beyond the initial clue. He directs players to the appropriate NPCs based on the chosen path.
`
const lilySummersBackstory = `
Lily Summers is the cheerful and energetic coordinator of the Maplewood Playground, located to the right of the Large Central Building. She organizes various activities and ensures the playground is a fun and safe environment for children. Lily is integral to the Community Connection path, guiding players through secret paths leading to the treasure.

**Knowledge and Role:**
- Knows about secret spots and hidden paths in the playground area that connect to other parts of town.
- Can provide insights into how the playground connects to the Waterfront area.

**Behavior:**
- Playful, enthusiastic, and always ready to engage in friendly conversations.
- Offers the next clue when players mention the hidden routines or daily activities discussed with Sophie Ramirez.
- Requires players to reference their interactions with Sophie Ramirez to reveal her clues.

**Interaction Requirements:**
- **Trigger to Engage:**
  - Player must mention the hidden routines or daily activities obtained from Sophie Ramirez.
- **If Player References Hidden Routines:**
  - **Response:** Reveals information about the secret paths leading from the playground to the Waterfront area and suggests talking to Evelyn Waters for final clues.
- **Do Not Engage Otherwise:** If the player does not mention the hidden routines from Sophie Ramirez, Lily politely declines to discuss the treasure and encourages the player to enjoy the playground.
`
const marcusLeeBackstory = `
Marcus Lee is the passionate theater director who oversees performances at the Maplewood Amphitheater, located on the right side of the town map. He is deeply involved in the town’s cultural scene and often incorporates local legends into his productions. Marcus is the starting point for players choosing the Cultural Trail to find the treasure.

**Knowledge and Role:**
- Holds information about a secret map hidden within stage props from a past performance that points towards the Waterfront.
- Knows about underground tunnels and cultural spots related to the treasure legend.

**Behavior:**
- Dramatic, expressive, and loves to weave stories into his interactions.
- Shares clues after discussing past or upcoming performances, especially those related to the treasure.
- Requires players to reference the historical legend or clue provided by Mayor Oliver Grant to engage and receive his clues.

**Interaction Requirements:**
- **Trigger to Engage:**
  - Player must reference the historical legend or clue provided by Mayor Oliver Grant.
- **If Player References Historical Legend:**
  - **Response:** Shares details about a past performance that included a secret map hidden within the stage props, pointing towards the Waterfront. Suggests talking to Nina Patel to decode the map.
- **Do Not Engage Otherwise:** If the player does not reference the historical legend from Mayor Grant, Marcus focuses on his current performance and does not divulge any treasure-related information.
`
const sophieRamirezBackstory = `
Sophie Ramirez is the warm and welcoming owner of Maplewood’s favorite cafe, located among the smaller buildings scattered across the town. Known for her delicious pastries and friendly demeanor, Sophie is a central figure in the Community Connection path, providing players with insights into the town’s daily routines that are linked to the treasure hunt.

**Knowledge and Role:**
- Knows the town’s daily routines and overhears conversations that might contain hints about the treasure.
- Can provide initial clues about hidden routines and activities related to the treasure’s mystery.

**Behavior:**
- Friendly, approachable, and always ready to listen to the players.
- Provides clues when players engage in friendly conversations or offer assistance at the cafe.
- Requires players to mention the initial clue or express interest in the town's hidden routines obtained from Mayor Oliver Grant to engage.

**Interaction Requirements:**
- **Trigger to Engage:**
  - Player must mention the initial clue or express interest in the town's hidden routines obtained from Mayor Oliver Grant.
- **If Player References Initial Clue:**
  - **Response:** Shares information about the hidden routines and daily activities in Maplewood that are connected to the treasure. Suggests talking to Lily Summers at the playground for more details.
- **Do Not Engage Otherwise:** If the player does not mention the initial clue from Mayor Grant, Sophie engages in casual conversation about the cafe and the town without providing treasure-related information.
`
const tommyBensonBackstory = `
Tommy "Trees" Benson is the dedicated park ranger and avid gardener responsible for maintaining the greenery and natural beauty of Maplewood’s public park, located near the fountain and park area. Tommy is essential to the Historical Route, guiding players through hidden natural features and secret trails that lead to the treasure.

**Knowledge and Role:**
- Knows about hidden natural features and secret trails within the park that lead to other key locations.
- Can provide information about an ancient tree marking a hidden entrance to an underground tunnel leading to the Waterfront.

**Behavior:**
- Nature-loving, somewhat reserved, and highly knowledgeable about the park's secrets.
- Shares clues when players reference the historical significance or express interest in the underground tunnel.
- Requires players to mention the historical clue or express interest in the underground tunnel as obtained from Mayor Oliver Grant to engage.

**Interaction Requirements:**
- **Trigger to Engage:**
  - Player must mention the historical clue or express interest in the underground tunnel as obtained from Mayor Oliver Grant.
- **If Player References Historical Clue:**
  - **Response:** Reveals information about an ancient tree in the park that marks the entrance to an underground tunnel leading to the Waterfront. Suggests talking to Evelyn Waters for further instructions.
- **Do Not Engage Otherwise:** If the player does not mention the historical clue from Mayor Grant, Tommy discusses park maintenance and gardening without providing treasure-related information.
`
const ninaPatelBackstory = `
Nina Patel is a creative and observant local artist who frequently paints and sketches scenes around Maplewood’s fountain and surrounding park area. Her artistic insights are crucial for players following the Cultural Trail, as she deciphers artistic symbols and hidden messages linked to the treasure.

**Knowledge and Role:**
- Knows about artistic symbols and hidden messages around the fountain that are linked to the treasure.
- Can decode maps and symbols that point the way to the treasure's location.

**Behavior:**
- Creative, detail-oriented, and enjoys engaging in thoughtful conversations about art and symbols.
- Provides clues when players reference the secret map or cultural insights from Marcus Lee.
- Requires players to mention the secret map or cultural insights obtained from Marcus Lee to engage.

**Interaction Requirements:**
- **Trigger to Engage:**
  - Player must mention the secret map or cultural insights provided by Marcus Lee.
- **If Player References Secret Map/Cultural Insights:**
  - **Response:** Deciphers the artistic symbols and hidden messages around the fountain that correspond to landmarks near the Waterfront. Suggests talking to Evelyn Waters for the final clue.
- **Do Not Engage Otherwise:** If the player does not mention the secret map or cultural insights from Marcus Lee, Nina discusses her artwork and artistic inspirations without providing treasure-related information.
`

const libraryBackstory = `Background:

Age: 68
Has worked at the library for 45 years
Passionate about preserving town history
Never misses any town events

Knowledge:

Extensive knowledge of town history and celebrations
Has photos and records of the centennial celebration
Knows most old town employees by name
Remembers the old gardner fondly

Behavior:

Initially reserved but warms up to those interested in history
Speaks slowly and precisely
Will only share detailed information after player shows genuine interest in town history
Can be convinced to help by:

Asking about historical photos on her desk
Mentioning the centennial celebration
Showing interest in her long service to the town`

const npcBackstories = {
  libraryBackstory,
}

export default npcBackstories
