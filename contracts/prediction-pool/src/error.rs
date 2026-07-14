use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized: only the contract admin can do this")]
    Unauthorized {},

    #[error("Match '{match_id}' has no kickoff set yet — call SetKickoff first")]
    KickoffNotSet { match_id: String },

    #[error("Predictions for match '{match_id}' are closed (kickoff has passed)")]
    PredictionsClosed { match_id: String },
}
