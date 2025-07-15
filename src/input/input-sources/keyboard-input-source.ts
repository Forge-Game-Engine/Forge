import MurmurHash3 from 'imurmurhash';
import { ButtonMoment, buttonMoments, KeyCode } from '../constants';
import { TriggerAction } from '../input-types';
import { ActionableInputSource } from './actionable-input-source';
import { InputWithArgs } from './input-source';

interface KeyboardBindArgs {
  moment: ButtonMoment;
  keyCode: KeyCode;
}

export class KeyboardInputSource
  implements ActionableInputSource<KeyboardBindArgs>
{
  private readonly _inputActions: InputWithArgs<
    TriggerAction,
    KeyboardBindArgs
  >[];
  private readonly _keyPresses = new Set<KeyCode>();
  private readonly _keyPressesDown = new Set<KeyCode>();
  private readonly _keyPressesUps = new Set<KeyCode>();

  private readonly _name = 'keyboard';

  constructor() {
    this._inputActions = [];

    window.addEventListener('keydown', this._onKeyDownHandler);
    window.addEventListener('keyup', this._onKeyUpHandler);
  }

  public bindAction(input: TriggerAction, args: KeyboardBindArgs): void {
    const actionAlreadyBound = this._inputActions.find(
      (item) =>
        item.args.keyCode === args.keyCode &&
        item.args.moment === args.moment &&
        item.input.name === input.name,
    );

    if (actionAlreadyBound) {
      return;
    }

    this._inputActions.push({ input, args });

    const idHash = MurmurHash3()
      .hash(input.name)
      .hash(args.keyCode)
      .hash(args.moment);

    const bindingId = idHash.result().toString(16);
    const displayText = `keyboard "${args.keyCode}" on ${args.moment})`;

    input.bind({ bindingId, displayText, sourceName: this._name });
  }

  public unbindAllFromAction(action: TriggerAction) {
    const actionsToUnbind = this._inputActions.filter(
      (item) => item.input.name !== action.name,
    );

    for (const action of actionsToUnbind) {
      const bindingsMatchingSource = action.input.bindings.filter(
        (binding) => binding.sourceName === this._name,
      );

      for (const binding of bindingsMatchingSource) {
        action.input.unbind(binding.bindingId);
      }
    }
  }

  public unbindAction(bindingId: string) {
    for (const inputAction of this._inputActions) {
      inputAction.input.unbind(bindingId);
    }
  }

  public reset(): void {
    this._keyPressesDown.clear();
    this._keyPressesUps.clear();
  }

  public stop(): void {
    window.removeEventListener('keydown', this._onKeyDownHandler);
    window.removeEventListener('keyup', this._onKeyUpHandler);
  }

  private readonly _onKeyDownHandler = (event: KeyboardEvent) => {
    this._keyPresses.add(event.code as KeyCode);
    this._keyPressesDown.add(event.code as KeyCode);

    for (const action of this._inputActions) {
      if (
        action.args.keyCode === (event.code as KeyCode) &&
        action.args.moment === buttonMoments.down
      ) {
        action.input.trigger();
      }
    }
  };

  private readonly _onKeyUpHandler = (event: KeyboardEvent) => {
    this._keyPresses.delete(event.code as KeyCode);
    this._keyPressesUps.add(event.code as KeyCode);

    for (const action of this._inputActions) {
      if (
        action.args.keyCode === (event.code as KeyCode) &&
        action.args.moment === buttonMoments.up
      ) {
        action.input.trigger();
      }
    }
  };
}
