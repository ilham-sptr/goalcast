use cosmwasm_std::Addr;
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema, Copy)]
pub enum Outcome {
    Home,
    Draw,
    Away,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Prediction {
    pub match_id: String,
    pub predictor: Addr,
    pub outcome: Outcome,
    pub submitted_at: u64, // block time, seconds
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema, Default)]
pub struct PoolTotals {
    pub home: u64,
    pub draw: u64,
    pub away: u64,
}

/// Contract admin — allowed to set/update each match's kickoff timestamp.
/// In the hackathon MVP this is the deployer's address; predictions for a
/// match are only accepted while `now < kickoff_timestamp`.
pub const ADMIN: Item<Addr> = Item::new("admin");

/// match_id -> kickoff unix timestamp (seconds). Predictions for a match
/// close once the chain's block time passes this value.
pub const KICKOFFS: Map<&str, u64> = Map::new("kickoffs");

/// (match_id, predictor) -> Prediction. Re-submitting before kickoff
/// overwrites the previous prediction (and adjusts pool totals accordingly).
pub const PREDICTIONS: Map<(&str, &Addr), Prediction> = Map::new("predictions");

/// match_id -> running totals, used for the pool split shown in the UI.
pub const POOL_TOTALS: Map<&str, PoolTotals> = Map::new("pool_totals");
