#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    to_json_binary, Addr, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, PoolStatusResponse, PredictionResponse, QueryMsg};
use crate::state::{Outcome, PoolTotals, Prediction, ADMIN, KICKOFFS, POOL_TOTALS, PREDICTIONS};

const CONTRACT_NAME: &str = "crates.io:prediction-pool";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let admin = match msg.admin {
        Some(a) => deps.api.addr_validate(&a)?,
        None => info.sender.clone(),
    };
    ADMIN.save(deps.storage, &admin)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("admin", admin))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::SetKickoff {
            match_id,
            kickoff_timestamp,
        } => execute_set_kickoff(deps, info, match_id, kickoff_timestamp),
        ExecuteMsg::RegisterPrediction { match_id, outcome } => {
            execute_register_prediction(deps, env, info, match_id, outcome)
        }
    }
}

fn execute_set_kickoff(
    deps: DepsMut,
    info: MessageInfo,
    match_id: String,
    kickoff_timestamp: u64,
) -> Result<Response, ContractError> {
    let admin = ADMIN.load(deps.storage)?;
    if info.sender != admin {
        return Err(ContractError::Unauthorized {});
    }

    KICKOFFS.save(deps.storage, &match_id, &kickoff_timestamp)?;

    Ok(Response::new()
        .add_attribute("method", "set_kickoff")
        .add_attribute("match_id", match_id)
        .add_attribute("kickoff_timestamp", kickoff_timestamp.to_string()))
}

fn execute_register_prediction(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    match_id: String,
    outcome: Outcome,
) -> Result<Response, ContractError> {
    let kickoff = KICKOFFS
        .may_load(deps.storage, &match_id)?
        .ok_or_else(|| ContractError::KickoffNotSet {
            match_id: match_id.clone(),
        })?;

    if env.block.time.seconds() >= kickoff {
        return Err(ContractError::PredictionsClosed {
            match_id: match_id.clone(),
        });
    }

    let predictor: Addr = info.sender.clone();
    let mut totals = POOL_TOTALS
        .may_load(deps.storage, &match_id)?
        .unwrap_or_default();

    // If this address already predicted for this match, undo its previous
    // contribution to the totals before applying the new one (re-submission
    // before kickoff overwrites, it does not stack).
    if let Some(existing) = PREDICTIONS.may_load(deps.storage, (&match_id, &predictor))? {
        decrement(&mut totals, existing.outcome);
    }
    increment(&mut totals, outcome);
    POOL_TOTALS.save(deps.storage, &match_id, &totals)?;

    let prediction = Prediction {
        match_id: match_id.clone(),
        predictor: predictor.clone(),
        outcome,
        submitted_at: env.block.time.seconds(),
    };
    PREDICTIONS.save(deps.storage, (&match_id, &predictor), &prediction)?;

    Ok(Response::new()
        .add_attribute("method", "register_prediction")
        .add_attribute("match_id", match_id)
        .add_attribute("predictor", predictor)
        .add_attribute("outcome", format!("{:?}", outcome)))
}

fn increment(totals: &mut PoolTotals, outcome: Outcome) {
    match outcome {
        Outcome::Home => totals.home += 1,
        Outcome::Draw => totals.draw += 1,
        Outcome::Away => totals.away += 1,
    }
}

fn decrement(totals: &mut PoolTotals, outcome: Outcome) {
    match outcome {
        Outcome::Home => totals.home = totals.home.saturating_sub(1),
        Outcome::Draw => totals.draw = totals.draw.saturating_sub(1),
        Outcome::Away => totals.away = totals.away.saturating_sub(1),
    }
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetPoolStatus { match_id } => to_json_binary(&query_pool_status(deps, match_id)?),
        QueryMsg::GetPrediction { match_id, address } => {
            to_json_binary(&query_prediction(deps, match_id, address)?)
        }
    }
}

fn query_pool_status(deps: Deps, match_id: String) -> StdResult<PoolStatusResponse> {
    let totals = POOL_TOTALS
        .may_load(deps.storage, &match_id)?
        .unwrap_or_default();
    let total = totals.home + totals.draw + totals.away;

    let pct = |n: u64| -> u8 {
        if total == 0 {
            0
        } else {
            ((n as u128 * 100) / total as u128) as u8
        }
    };

    Ok(PoolStatusResponse {
        match_id,
        home: totals.home,
        draw: totals.draw,
        away: totals.away,
        home_pct: pct(totals.home),
        draw_pct: pct(totals.draw),
        away_pct: pct(totals.away),
    })
}

fn query_prediction(deps: Deps, match_id: String, address: String) -> StdResult<PredictionResponse> {
    let addr = deps.api.addr_validate(&address)?;
    let found = PREDICTIONS.may_load(deps.storage, (&match_id, &addr))?;

    Ok(PredictionResponse {
        match_id,
        address,
        outcome: found.as_ref().map(|p| p.outcome),
        submitted_at: found.as_ref().map(|p| p.submitted_at),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{from_json, Timestamp};

    #[test]
    fn full_flow_register_and_query() {
        let mut deps = mock_dependencies();
        let admin_info = mock_info("admin", &[]);
        instantiate(deps.as_mut(), mock_env(), admin_info.clone(), InstantiateMsg { admin: None }).unwrap();

        // Open the match: kickoff 1000s in the future relative to mock_env's default time.
        let mut env = mock_env();
        let kickoff = env.block.time.seconds() + 1000;
        execute(
            deps.as_mut(),
            env.clone(),
            admin_info,
            ExecuteMsg::SetKickoff {
                match_id: "m1".into(),
                kickoff_timestamp: kickoff,
            },
        )
        .unwrap();

        // Fan submits a prediction before kickoff.
        let fan_info = mock_info("fan1", &[]);
        execute(
            deps.as_mut(),
            env.clone(),
            fan_info,
            ExecuteMsg::RegisterPrediction {
                match_id: "m1".into(),
                outcome: Outcome::Home,
            },
        )
        .unwrap();

        let res = query(deps.as_ref(), env.clone(), QueryMsg::GetPoolStatus { match_id: "m1".into() }).unwrap();
        let status: PoolStatusResponse = from_json(res).unwrap();
        assert_eq!(status.home, 1);
        assert_eq!(status.home_pct, 100);

        // After kickoff, predictions should be rejected.
        env.block.time = Timestamp::from_seconds(kickoff + 1);
        let late_info = mock_info("fan2", &[]);
        let err = execute(
            deps.as_mut(),
            env,
            late_info,
            ExecuteMsg::RegisterPrediction {
                match_id: "m1".into(),
                outcome: Outcome::Away,
            },
        )
        .unwrap_err();
        matches!(err, ContractError::PredictionsClosed { .. });
    }
}
