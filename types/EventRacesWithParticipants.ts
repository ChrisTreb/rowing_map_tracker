import { Participant } from './Participant';
import { Race } from './Race';

export type EventRacesWithParticipants = {
    message: string;
    races: Race[];
    participants: Participant[];
};