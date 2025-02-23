from typing import Literal


type CheckboxState = Literal[0, 1]


class Checkboxes:
    def __init__(self, length: int) -> None:
        self.length = length
        self.checkboxes: list[CheckboxState] = [0 for _ in range(0, length)]

    def set(self, index: int, value: CheckboxState) -> None:
        self.checkboxes[index] = value

    def get_state(self) -> list[CheckboxState]:
        return self.checkboxes
