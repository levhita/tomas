import { createStore } from 'vuex'

export default createStore({
  state: {
    transactions: []
  },
  mutations: {
    ADD_TRANSACTION(state, transaction) {
      state.transactions.push(transaction)
    },
    SET_TRANSACTIONS(state, transactions) {
      state.transactions = transactions
    }
  },
  actions: {
    addTransaction({ commit }, transaction) {
      commit('ADD_TRANSACTION', transaction)
    },
    setTransactions({ commit }, transactions) {
      commit('SET_TRANSACTIONS', transactions)
    }
  },
  getters: {
    transactions: state => state.transactions
  }
})