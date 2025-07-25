import { ActionableInputSource } from '../input-sources';
import { InputInteraction } from './input-interaction';

export class KeyboardAxis1dInteraction extends InputInteraction<void> {
    constructor(source: ActionableInputSource) {
        super(undefined, source);
    }
    
    public override matchesArgs(): boolean {
        return true; // This interaction does not have specific args to match against as it is the keyboard axis interaction.
    }
    
    override get displayText(): string {
        return 'On keyboard axis';
    }
}