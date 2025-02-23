from typing import Literal


def read_uint24(data: bytes, offset: int = 0, little_endian: bool = True) -> int:
    """Reads a 3-byte (24-bit) unsigned integer from a bytes object.

    Args:
        data (bytes): The bytes object containing the data.
        offset (int): The byte offset to start reading from.
        little_endian (bool): If True, read as little-endian; otherwise, big-endian.

    Returns:
        int: The 24-bit unsigned integer.
    """
    byte_order = "little" if little_endian else "big"
    return int.from_bytes(data[offset : offset + 3], byte_order)


def byte_padding_length(bits_length: int) -> int:
    return (8 - bits_length % 8) % 8


def pack_bits(bits: list[Literal[0, 1]]) -> bytes:
    """Pack a list of 0s and 1s into bytes (big endian, as it's going to be read like that)."""
    padded_bits = bits + [0] * byte_padding_length(len(bits))  # Ensure multiple of 8
    packed = bytearray()
    for i in range(0, len(padded_bits), 8):
        byte = sum((padded_bits[i + j] << (7 - j)) for j in range(8))
        packed.append(byte)
    return bytes(packed)
