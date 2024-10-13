import { z } from "zod";

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

export const move_to_args = z.object({
    x: z.number(),
    y: z.number(),
  });