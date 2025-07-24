# Inputs

Forge has a robust input system built to be extensible and testable.

Before using the input feature set there are a few important concepts you should get familiar with:

* **Actions** are things that the player can "do" in your game; for example jump, shoot, walk, aim, etc.
* **Sources** are physical input devices; for example keyboard, mouse, gamepad etc.
* **Interactions** uniquely define the player's interaction with an input source; for example, the "A" button on the gamepad is released.
* **Groups** are a collection of interactions that can be activated or deactivated together.