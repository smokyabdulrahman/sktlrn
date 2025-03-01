from dataclasses import dataclass
from enum import StrEnum


class ServerMessageType(StrEnum):
    INIT = "INIT"  # 0b000_____
    TOGGLED = "TOGGLED"
    DIFF = "DIFF"

    def to_int(self) -> int:
        match self:
            case ServerMessageType.INIT:
                return 0
            case ServerMessageType.TOGGLED:
                return 1
            case ServerMessageType.DIFF:
                return 2


@dataclass
class ServerMessageHeader:
    type_: ServerMessageType  # determined by 1st, 2nd, 3rd bits 0b###_____
    last_byte_length: int  # determined by 4th, 5th, 6th bits 0b___###__
    remaining_2_bits: int

    def to_bytes(self) -> bytes:
        type_as_int = self.type_.to_int()
        a = bytes(
            [(type_as_int << 5) | (self.last_byte_length << 2) | self.remaining_2_bits]
        )
        return a


@dataclass
class ServerMessage:
    header: ServerMessageHeader
    body: bytes

    def to_bytes(self) -> bytes:
        byte_array = bytearray(self.header.to_bytes())
        byte_array.extend(self.body)
        return byte_array


class ClientMessageType(StrEnum):
    TOGGLE = "TOGGLE"  # 0b001_____

    @classmethod
    def from_int(cls, message_type: int) -> "ClientMessageType":
        match message_type:
            case 1:
                return cls.TOGGLE
        raise ValueError(
            f"message type of int value: {message_type} doesn't match any known type."
        )


@dataclass
class ClientMessageHeader:
    type_: ClientMessageType  # determined by 1st, 2nd, 3rd bits 0b###_____
    last_byte_length: int  # determined by 4th, 5th, 6th bits 0b___###__
    remaining_2_bits: int

    @classmethod
    def from_int(cls, int_: int) -> "ClientMessageHeader":
        type_ = int_ >> 5
        last_byte_length = (int_ & 0b00011100) >> 2
        remaining_2_bits = int_ & 0b00000011
        return ClientMessageHeader(
            type_=ClientMessageType.from_int(type_),
            last_byte_length=last_byte_length,
            remaining_2_bits=remaining_2_bits,
        )


@dataclass
class ClientMessage:
    header: ClientMessageHeader
    body: bytes

    @classmethod
    def from_bytes(cls, bytes_: bytes) -> "ClientMessage":
        return ClientMessage(
            header=ClientMessageHeader.from_int(bytes_[0]),
            body=bytes_[1:],
        )
