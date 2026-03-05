import Array "mo:core/Array";
import List "mo:core/List";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";



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

  type RoomPlayer = {
    id : Text;
    name : Text;
    isHost : Bool;
    joinedAt : Int;
  };

  type RoomStatus = {
    #waiting;
    #ready;
    #starting;
  };

  let results = List.empty<GameResult>();
  let heroStats = Map.empty<Text, Nat>();
  let rooms = Map.empty<Text, Room>();

  type Room = {
    code : Text;
    players : [RoomPlayer];
    maxPlayers : Nat;
    level : Nat;
    status : RoomStatus;
    hostId : Text;
    createdAt : Int;
  };

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

  public shared ({ caller }) func createRoom(code : Text, hostId : Text, hostName : Text, maxPlayers : Nat, level : Nat) : async Room {
    let hostPlayer : RoomPlayer = {
      id = hostId;
      name = hostName;
      isHost = true;
      joinedAt = Time.now();
    };

    let room : Room = {
      code;
      players = [hostPlayer];
      maxPlayers;
      level;
      status = #waiting;
      hostId;
      createdAt = Time.now();
    };

    rooms.add(code, room);
    room;
  };

  public shared ({ caller }) func joinRoom(code : Text, playerId : Text, playerName : Text) : async ?Room {
    switch (rooms.get(code)) {
      case (null) { null };
      case (?room) {
        if (room.players.size() >= room.maxPlayers) { return null };

        let existingPlayer = room.players.find(func(player) { player.id == playerId });
        switch (existingPlayer) {
          case (?_) {
            return ?room;
          };
          case (null) {};
        };

        let newPlayer : RoomPlayer = {
          id = playerId;
          name = playerName;
          isHost = false;
          joinedAt = Time.now();
        };

        let updatedPlayers = room.players.concat([newPlayer]);
        let updatedStatus = if (updatedPlayers.size() >= 2) { #ready } else {
          #waiting;
        };

        let updatedRoom : Room = {
          room with
          players = updatedPlayers;
          status = updatedStatus;
        };

        rooms.add(code, updatedRoom);
        ?updatedRoom;
      };
    };
  };

  public query ({ caller }) func getRoomState(code : Text) : async ?Room {
    rooms.get(code);
  };

  public shared ({ caller }) func startRoom(code : Text, hostId : Text) : async Bool {
    switch (rooms.get(code)) {
      case (null) { false };
      case (?room) {
        if (room.hostId != hostId) { return false };
        let updatedRoom : Room = { room with status = #starting };
        rooms.add(code, updatedRoom);
        true;
      };
    };
  };

  public shared ({ caller }) func leaveRoom(code : Text, playerId : Text) : async Bool {
    switch (rooms.get(code)) {
      case (null) { false };
      case (?room) {
        let remainingPlayers = room.players.filter(func(player) { player.id != playerId });
        if (remainingPlayers.size() == 0) {
          rooms.remove(code);
          return true;
        };

        let updatedPlayers = remainingPlayers.map(func(player) { player });
        var newHostId = room.hostId;

        if (playerId == room.hostId) {
          switch (remainingPlayers[0]) {
            case (firstPlayer) {
              let updatedHost = { firstPlayer with isHost = true };
              let remainingWithoutHost = updatedPlayers.filter(func(p) { p.id != updatedHost.id });
              let finalPlayers = [updatedHost].concat(remainingWithoutHost);
              newHostId := updatedHost.id;

              let updatedRoom = {
                room with
                players = finalPlayers;
                hostId = newHostId;
              };
              rooms.add(code, updatedRoom);
            };
            case (_) {};
          };
        } else {
          let updatedRoom = {
            room with
            players = updatedPlayers;
          };
          rooms.add(code, updatedRoom);
        };

        true;
      };
    };
  };
};
