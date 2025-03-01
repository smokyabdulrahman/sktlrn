from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuration(BaseSettings):
    num_of_checkboxes: int = Field(
        1_000_000,
        description="number of checkboxes client should render",
    )
    broadcast_diff_window_ms: int = Field(
        1_000,
        description="time window in milliseconds "
        "to calculate state diff "
        "and broadcast it to clients.",
    )
    model_config = SettingsConfigDict(env_prefix="sktlrn_")
