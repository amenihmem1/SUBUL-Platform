'use client';

import { useState } from 'react';
import {
  Building2, Search, Filter, Eye, Trash2,
  CheckCircle, XCircle, Users, FileText, Clock,
  Briefcase, UserCheck, Plus, ChevronLeft, ChevronRight,
  Calendar, BookOpen, X, TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge, Button, useToast } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  useCompanies,
  useUpdateCompany,
  useDeleteCompany,
  useUpdateEmployeeStatus,
  useAddEmployee,
} from '@/hooks/api/useCompanies';
import type { Company } from '@/services/companies';

const ITEMS_PER_PAGE = 10;

export default function CompaniesManagement() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [viewTab, setViewTab] = useState<'employees' | 'publications'>('employees');

  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', position: '' });

  const { data: paginatedData, isLoading } = useCompanies({
    status: filterStatus !== 'all' ? filterStatus : undefined,
    search: searchQuery || undefined,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const companies = paginatedData?.data ?? [];
  const totalCompanies = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const updateCompanyMutation = useUpdateCompany();
  const deleteCompanyMutation = useDeleteCompany();
  const updateEmployeeStatusMutation = useUpdateEmployeeStatus();
  const addEmployeeMutation = useAddEmployee();

  const totalAcceptedEmployees = companies.reduce(
    (acc, c) => acc + c.employees.filter(e => e.status === 'accepted').length,
    0
  );

  const totalPublications = companies.reduce(
    (acc, c) => acc + c.publications.length,
    0
  );

  const stats = [
    { label: t('companies.totalCompanies'), value: totalCompanies, change: '+12%', icon: Building2, color: 'bg-primary/10 text-primary' },
    { label: t('companies.pendingApproval'), value: companies.filter(c => c.status === 'pending').length, change: '+2%', icon: Clock, color: 'bg-amber-50 text-amber-700' },
    { label: t('companies.activeEmployees'), value: totalAcceptedEmployees, change: '+15%', icon: UserCheck, color: 'bg-green-50 text-green-700' },
    { label: t('companies.totalPublications'), value: totalPublications, change: '+8%', icon: FileText, color: 'bg-purple-50 text-purple-700' },
  ];

  const handleToggleStatus = async (company: Company) => {
    const newStatus = company.status === 'active' ? 'inactive' : 'active';
    try {
      await updateCompanyMutation.mutateAsync({ id: company.id, data: { status: newStatus } });
    } catch (err) {
      console.error(err);
      showToast(String(t('common.error') || 'Something went wrong'), 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedCompany) {
      try {
        await deleteCompanyMutation.mutateAsync(selectedCompany.id);
        setShowDeleteModal(false);
        setSelectedCompany(null);
      } catch (err) {
        console.error(err);
        showToast(String(t('common.error') || 'Something went wrong'), 'error');
      }
    }
  };

  const handleEmployeeAction = async (companyId: string, employeeId: number, action: 'accepted' | 'rejected') => {
    try {
      await updateEmployeeStatusMutation.mutateAsync({ companyId, employeeId, status: action });
      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany({
          ...selectedCompany,
          employees: selectedCompany.employees.map(e =>
            e.id === employeeId ? { ...e, status: action } : e
          ),
        });
      }
    } catch (err) {
      console.error(err);
      showToast(String(t('common.error') || 'Something went wrong'), 'error');
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.position || !selectedCompany) return;
    try {
      await addEmployeeMutation.mutateAsync({
        companyId: selectedCompany.id,
        data: { name: newEmployee.name, email: newEmployee.email, position: newEmployee.position },
      });
      setNewEmployee({ name: '', email: '', position: '' });
      setShowAddEmployeeModal(false);
    } catch (err) {
      console.error(err);
      showToast(String(t('common.error') || 'Something went wrong'), 'error');
    }
  };

  const openViewModal = (company: Company) => {
    setSelectedCompany(company);
    setViewTab('employees');
    setShowViewModal(true);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'inactive':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t('common.active');
      case 'pending':
        return t('common.pending');
      case 'inactive':
        return t('common.inactive');
      default:
        return status;
    }
  };

  const getEmployeeStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getEmployeeStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted':
        return t('companies.accepted');
      case 'rejected':
        return t('companies.rejected');
      case 'pending':
        return t('companies.pending');
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6 p-1">
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {stats.map((stat, index) => {
          const StatIcon = stat.icon;
          return (
          <motion.div
            key={index}
            className="bg-card rounded-2xl p-6 border border-border shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stat.color}`}>
                <StatIcon className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="w-3 h-3" />
                {stat.change}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <motion.h3
                  className="text-3xl font-extrabold tracking-tight text-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  {stat.value}
                </motion.h3>
                <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
              </div>
            </div>
          </motion.div>
          );
        })}
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`${t('common.search')}...`}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" /> {t('common.filter')}
            </Button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-10">
                {['all', 'active', 'pending', 'inactive'].map(status => (
                  <button
                    key={status}
                    onClick={() => { setFilterStatus(status); setShowFilters(false); setCurrentPage(1); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${filterStatus === status ? 'bg-blue-50 text-blue-600' : ''}`}
                  >
                    {status === 'all' ? t('common.all') :
                     status === 'active' ? t('common.active') :
                     status === 'pending' ? t('common.pending') :
                     t('common.inactive')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t('companies.company')}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t('companies.sector')}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t('companies.employeesCount')}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t('common.status')}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t('companies.publicationsCount')}</th>
                <th className="text-left p-4 text-sm font-medium text-slate-600">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                <tr key={company.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{company.name}</p>
                        <p className="text-sm text-slate-500">{company.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{company.sector ?? '-'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{company.employees.length}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant="secondary"
                      className={getStatusBadgeClass(company.status)}
                    >
                      {getStatusLabel(company.status)}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{company.publications.length}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openViewModal(company)}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                        title={t('common.view') as string}
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(company)}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                        title={company.status === 'active' ? (t('companies.deactivate') as string) : (t('companies.activate') as string)}
                      >
                        {company.status === 'active' ? (
                          <XCircle className="w-4 h-4 text-amber-600" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </button>
                      <button
                        onClick={() => { setSelectedCompany(company); setShowDeleteModal(true); }}
                        className="p-2 hover:bg-red-100 rounded-lg"
                        title={t('companies.deleteCompany') as string}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
              {!isLoading && companies.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {t('common.noResults') || 'No results found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCompanies)} / {totalCompanies}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={page === currentPage ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {showViewModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedCompany.name}</h2>
                  <p className="text-slate-500">{selectedCompany.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">{selectedCompany.sector ?? '-'}</Badge>
                    <Badge variant="secondary" className={getStatusBadgeClass(selectedCompany.status)}>
                      {getStatusLabel(selectedCompany.status)}
                    </Badge>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-slate-900">{selectedCompany.employees.length}</p>
                <p className="text-sm text-slate-500">{t('companies.employeesCount')}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {selectedCompany.employees.filter(e => e.status === 'pending').length}
                </p>
                <p className="text-sm text-slate-500">{t('companies.pendingEmployees')}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-slate-900">{selectedCompany.publications.length}</p>
                <p className="text-sm text-slate-500">{t('companies.publicationsCount')}</p>
              </div>
            </div>

            <div className="flex gap-1 mb-6 border-b border-slate-200">
              <button
                onClick={() => setViewTab('employees')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  viewTab === 'employees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('companies.employeesCount')} ({selectedCompany.employees.length})
              </button>
              <button
                onClick={() => setViewTab('publications')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  viewTab === 'publications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('companies.publications')} ({selectedCompany.publications.length})
              </button>
            </div>

            {viewTab === 'employees' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    {t('companies.pendingEmployees')}
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setShowAddEmployeeModal(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4 mr-1" /> {t('companies.addEmployee')}
                  </Button>
                </div>

                {selectedCompany.employees.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    {t('companies.noEmployees') || 'No employees found'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedCompany.employees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{employee.name}</p>
                            <p className="text-sm text-slate-500">{employee.email}</p>
                            <p className="text-xs text-slate-400">{(employee.position ?? '-')} &middot; {(employee.requestDate ?? '-')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={getEmployeeStatusBadgeClass(employee.status)}>
                            {getEmployeeStatusLabel(employee.status)}
                          </Badge>
                          {employee.status === 'pending' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEmployeeAction(selectedCompany.id, employee.id, 'accepted')}
                                className="p-1.5 hover:bg-green-100 rounded-lg"
                                title={t('companies.acceptEmployee') as string}
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => handleEmployeeAction(selectedCompany.id, employee.id, 'rejected')}
                                className="p-1.5 hover:bg-red-100 rounded-lg"
                                title={t('companies.rejectEmployee') as string}
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {viewTab === 'publications' && (
              <div className="space-y-3">
                {selectedCompany.publications.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    {t('companies.noPublications') || 'No publications found'}
                  </p>
                ) : (
                  selectedCompany.publications.map((publication) => (
                    <div key={publication.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {publication.publicationType === 'Formation' ? (
                            <BookOpen className="w-4 h-4 text-blue-600" />
                          ) : publication.publicationType === 'Certification' ? (
                            <FileText className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Calendar className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{publication.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm text-slate-500">{t('companies.publicationDate')}: {publication.date ?? '-'}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {publication.publicationType ?? '-'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setShowViewModal(false)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAddEmployeeModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddEmployeeModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">{t('companies.addEmployee')}</h2>
              <button onClick={() => setShowAddEmployeeModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{selectedCompany.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('companies.employeeName')} *</label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('companies.employeeName') as string}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('companies.employeeEmail')} *</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('companies.employeeEmail') as string}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('companies.employeePosition')} *</label>
                <input
                  type="text"
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('companies.employeePosition') as string}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowAddEmployeeModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleAddEmployee}
                className="bg-primary hover:bg-primary/90"
                disabled={!newEmployee.name || !newEmployee.email || !newEmployee.position}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-semibold mb-2">{t('companies.deleteCompany')}</h2>
            <p className="text-slate-600 mb-6">
              {t('companies.confirmDelete', { name: selectedCompany.name })}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
