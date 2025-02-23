from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuration(BaseSettings):
    num_of_checkboxes: int = Field(
        1_000_000,
        description="number of checkboxes client should render",
    )
    model_config = SettingsConfigDict(env_prefix="sktlrn_")
