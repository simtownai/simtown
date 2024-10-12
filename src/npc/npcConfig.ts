export const npcConfig = [
    {
    backstory: [
        "I used to live in a small village.",
        "I love exploring new places.",
    ],
    planForTheDay: [
        "Talk with sb",
    ]
    }, {
    backstory: [
        "I hate talking with people.",
    ],
    planForTheDay: [
        "Do not talk with anyone.",
    ]
}
]

export const tools = [
    {
        type: "function",
        "function": {
            name: "move_to",
            description: "Move the NPC to the specified coordinates.",
            parameters: {
                type: "object",
                properties: {
                    x: { type: "number", description: "The X coordinate to move to." },
                    y: { type: "number", description: "The Y coordinate to move to." },
                },
                required: ["x", "y"],
            }
        }
    },
    {
        type: "function",
        "function": {
            name: "say",
            description: "Send a message to the player.",
            parameters: {
                type: "object",
                properties: {
                    message: { type: "string", description: "The message to send." },
                },
                required: ["message"],
            },
        },
    }
  ];