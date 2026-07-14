use cosmwasm_schema::{cw_serde, QueryResponses};

use crate::state::Outcome;

#[cw_serde]
pub struct InstantiateMsg {
    /// Optional admin override; defaults to the deployer (info.sender).
    pub admin: Option<String>,
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Admin-only: open a match for predictions and set when it closes.
    SetKickoff {
        match_id: String,
        kickoff_timestamp: u64, // unix seconds
    },
    /// Submit (or update, before kickoff) a prediction for a match.
    RegisterPrediction {
        match_id: String,
        outcome: Outcome,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Aggregated pool split for a match — powers the UI's percentage bar.
    #[returns(PoolStatusResponse)]
    GetPoolStatus { match_id: String },

    /// A specific address's prediction for a match, if any.
    #[returns(PredictionResponse)]
    GetPrediction { match_id: String, address: String },
}

#[cw_serde]
pub struct PoolStatusResponse {
    pub match_id: String,
    pub home: u64,
    pub draw: u64,
    pub away: u64,
    pub home_pct: u8,
    pub draw_pct: u8,
    pub away_pct: u8,
}

#[cw_serde]
pub struct PredictionResponse {
    pub match_id: String,
    pub address: String,
    pub outcome: Option<Outcome>,
    pub submitted_at: Option<u64>,
}
