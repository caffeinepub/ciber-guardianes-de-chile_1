import Array "mo:core/Array";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Order "mo:core/Order";

actor {
  type Player = {
    name : Text;
    hero : Text;
  };

  type GameResult = {
    winnerPlayer : Player;
    winnerPlayerIndex : Nat;
    turnsPlayed : Nat;
    players : [Player];
  };

  module GameResult {
    public func compareByTurnsPlayed(result1 : GameResult, result2 : GameResult) : Order.Order {
      Nat.compare(result1.turnsPlayed, result2.turnsPlayed);
    };
  };

  let results = List.empty<GameResult>();

  let heroStats = Map.empty<Text, Nat>();

  func incrementHeroCount(hero : Text) {
    let current = switch (heroStats.get(hero)) {
      case (null) { 0 };
      case (?count) { count };
    };
    heroStats.add(hero, current + 1);
  };

  public shared ({ caller }) func saveGame(gameResult : GameResult) : async () {
    results.add(gameResult);

    for (player in gameResult.players.values()) {
      incrementHeroCount(player.hero);
    };
  };

  public query ({ caller }) func getTop10ByTurns() : async [GameResult] {
    results.toArray().sort(GameResult.compareByTurnsPlayed).sliceToArray(0, 10);
  };

  public query ({ caller }) func getTotalGames() : async Nat {
    results.size();
  };

  public query ({ caller }) func getMostPopularHero() : async ?(Text, Nat) {
    var maxHero : ?(Text, Nat) = null;
    var maxCount : Nat = 0;

    for ((hero, count) in heroStats.entries()) {
      if (count > maxCount) {
        maxCount := count;
        maxHero := ?(hero, count);
      };
    };

    maxHero;
  };
};
