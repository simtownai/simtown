// Brain.ts

export type EventType = 'talking'  | 'walking' | 'listening' | 'broadcasting' | 'moving' | 'idle';

interface Reflection {
  event: EventType;
  details: string;
  timestamp: Date;
}

class Brain {
  backstory: string[];
  observationState: Reflection[];
currentState: EventType;
  planForTheDay: string[];

  constructor(backstory: string[] = [], planForTheDay: string[] = []) {
    this.backstory = backstory;
    this.observationState = [];
    this.currentState = 'idle';
    this.planForTheDay = planForTheDay;
  }

  addObservation(reflection: Reflection) {
    this.observationState.push(reflection);
  }

  setCurrentState(state: EventType) {
    this.currentState = state;
  }

  addToPlan(task: string) {
    this.planForTheDay.push(task);
  }
    
    

}

export { Brain };
